/**
 * INSTRUCCIONES PARA VINCULAR CON TU HOJA DE CÁLCULO DE GOOGLE:
 * 
 * 1. Crea una nueva Hoja de Cálculo en Google Drive.
 * 2. Ve a 'Extensiones' > 'Apps Script'.
 * 3. Borra el código que aparece ahí y pega TODO el código de este archivo.
 * 4. Guarda el proyecto (con el ícono del disquete).
 * 5. Haz clic en 'Implementar' (arriba a la derecha) > 'Nueva implementación'.
 * 6. Selecciona tipo: 'Aplicación web'.
 * 7. En 'Ejecutar como', elige 'Yo'.
 * 8. En 'Quién tiene acceso', elige 'Cualquier persona' o 'Cualquiera'.
 * 9. Haz clic en 'Implementar' y copia la 'URL de la aplicación web'.
 * 10. ¡Pega esa URL en tu proyecto de React en: src/services/sheetService.js!
 */

const SHEET_NAME = 'Comidas';
const CALENDAR_SHEET = 'Calendario';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Hoja de Catálogo de Comidas
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Nombre', 'Ingredientes', 'Quincena', 'Tipo', 'Imagen']);
    sheet.getRange('A1:F1').setFontWeight('bold').setBackground('#efefef');
  }

  // Hoja de Calendario
  let calSheet = ss.getSheetByName(CALENDAR_SHEET);
  if (!calSheet) {
    calSheet = ss.insertSheet(CALENDAR_SHEET);
    calSheet.appendRow(['Fecha', 'Desayuno_ID', 'Comida_ID', 'Cena_ID']);
    calSheet.getRange('A1:D1').setFontWeight('bold').setBackground('#efefef');
  }

  // Fuerza la solicitud de permisos para peticiones externas (UrlFetchApp)
  try {
    UrlFetchApp.getRequest("https://www.google.com");
  } catch (e) { }
}

// Función auxiliar para guardar imágenes Base64 en un directorio público de tu Drive
function saveImageToDrive(base64Data, filename) {
  try {
    const folderName = "MenusComidas_Images";
    let folders = DriveApp.getFoldersByName(folderName);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      // Give the folder public viewing access so images can be displayed
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    // El formato es "data:image/jpeg;base64,ABC..."
    const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
    const base64Str = base64Data.split(',')[1];

    const blob = Utilities.newBlob(Utilities.base64Decode(base64Str), mimeString || 'image/jpeg', filename + "_" + new Date().getTime() + ".jpg");
    const file = folder.createFile(blob);

    // Para renderizar imágenes en HTML desde Drive de forma fiable (evita bloqueos de OpaqueResponseBlocking)
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (e) {
    return ""; // Si falla, que no rompa pero devolverá vacío
  }
}

// Maneja peticiones GET
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return createJsonResponse({ status: 'error', message: 'No spreadsheet access' });

    const action = e.parameter.action;

    if (action === 'getCalendar') {
      const calSheet = ss.getSheetByName(CALENDAR_SHEET) || ss.insertSheet(CALENDAR_SHEET);
      const data = calSheet.getDataRange().getValues();
      const calendar = {};
      if (data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0]) {
            // Usamos formato YYYY-MM-DD como clave
            const dateKey = Utilities.formatDate(new Date(row[0]), "GMT", "yyyy-MM-dd");
            calendar[dateKey] = {
              desayunoId: row[1] || null,
              comidaId: row[2] || null,
              cenaId: row[3] || null
            };
          }
        }
      }
      return createJsonResponse(calendar);
    }

    // Default: getDishes
    let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const items = [];
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0]) {
          items.push({
            id: row[0].toString(),
            name: row[1],
            ingredients: row[2] ? row[2].toString().split(',').map(item => item.trim()) : [],
            quincena: parseInt(row[3]) || 0,
            tipo: row[4] || 'Comida',
            image: row[5] || ''
          });
        }
      }
    }
    return createJsonResponse(items);
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// --- CONFIGURACIÓN DE SEGURIDAD ---
// Agrega aquí los correos que pueden editar la información
const AUTHORIZED_EMAILS = [
  'tonyvllegas@gmail.com',
  'v8580055@gmail.com',
  'munozerika237@gmail.com'
];

// Maneja peticiones POST
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return createJsonResponse({ status: 'error', message: 'No data' });
    const postData = JSON.parse(e.postData.contents);
    const idToken = postData.idToken;

    if (!idToken) return createJsonResponse({ status: 'error', message: 'Falta token' });
    const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken);
    const tokenInfo = JSON.parse(response.getContentText());
    if (!tokenInfo || AUTHORIZED_EMAILS.indexOf(tokenInfo.email) === -1) {
      return createJsonResponse({ status: 'error', message: 'No autorizado' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (postData.action === 'saveCalendarAssignment') {
      const calSheet = ss.getSheetByName(CALENDAR_SHEET) || ss.insertSheet(CALENDAR_SHEET);
      const { date, breakfastId, lunchId, dinnerId } = postData.payload;

      // Asegurarnos de que el date viene como YYYY-MM-DD
      const targetDateStr = date;
      const data = calSheet.getDataRange().getValues();
      let rowIndex = -1;

      // Buscar si ya existe la fecha (empezamos en 1 para saltar cabecera)
      for (let i = 1; i < data.length; i++) {
        let rowDate = data[i][0];
        let rowDateStr = "";

        if (rowDate instanceof Date) {
          rowDateStr = Utilities.formatDate(rowDate, "GMT", "yyyy-MM-dd");
        } else {
          rowDateStr = rowDate.toString();
        }

        if (rowDateStr.indexOf(targetDateStr) !== -1) {
          rowIndex = i + 1;
          break;
        }
      }

      const rowData = [targetDateStr, breakfastId || "", lunchId || "", dinnerId || ""];

      if (rowIndex === -1) {
        calSheet.appendRow(rowData);
      } else {
        calSheet.getRange(rowIndex, 1, 1, 4).setValues([rowData]);
      }
      return createJsonResponse({
        status: 'success',
        debug: {
          action: 'saved',
          row: rowIndex === -1 ? 'new' : rowIndex,
          data: rowData
        }
      });
    }

    if (postData.action === 'saveDishes') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) {
        return createJsonResponse({ status: 'error', message: 'No se pudo acceder a la hoja de cálculo.' });
      }

      let sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) {
        setup();
        sheet = ss.getSheetByName(SHEET_NAME);
      }

      // Limpiar datos existentes (excepto cabecera)
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 6).clearContent();
      }

      // Insertar nuevos datos
      const dishes = postData.payload;
      if (dishes && dishes.length > 0) {
        const rows = [];
        for (let j = 0; j < dishes.length; j++) {
          let dishImage = dishes[j].image || '';
          if (dishImage.startsWith('data:image/')) {
            dishImage = saveImageToDrive(dishImage, 'platillo_' + dishes[j].id);
          }

          rows.push([
            dishes[j].id,
            dishes[j].name,
            (dishes[j].ingredients || []).join(', '),
            dishes[j].quincena,
            dishes[j].tipo || 'Comida',
            dishImage
          ]);
        }

        if (rows.length > 0) {
          sheet.getRange(2, 1, rows.length, 6).setValues(rows);
        }
      }

      return createJsonResponse({ status: 'success' });
    }

    return createJsonResponse({ status: 'error', message: 'Acción no reconocida' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: 'Error de servidor: ' + error.toString() });
  }
}

// Función auxiliar para centralizar la creación de respuestas JSON con CORS habilitado por Apps Script
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
