// ==========================================
// CONFIGURACIÓN DE GOOGLE SHEETS
// ==========================================
const GOOGLE_SHEETS_WEB_APP_URL = import.meta.env.VITE_GOOGLE_SHEETS_APP_URL || '';

// Fallback al localStorage si no hay URL configurada
const STORAGE_KEY = 'menus_comidas_data';

export const fetchDishes = async () => {
  if (GOOGLE_SHEETS_WEB_APP_URL) {
    try {
      console.log("Fetching dishes from:", GOOGLE_SHEETS_WEB_APP_URL);
      const response = await fetch(`${GOOGLE_SHEETS_WEB_APP_URL}?action=getDishes`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching from Google Sheets:", error);
      console.info("TIP: Revisa si el script está publicado como 'Cualquier persona' (Anyone) y no 'Cualquier persona con cuenta de Google'.");
      return []; // Devolver array vacío para evitar que la UI explote
    }
  } else {
    console.warn("GOOGLE_SHEETS_WEB_APP_URL no configurada");
    return [];
  }
};

export const saveDishes = async (dishes, idToken) => {
  if (GOOGLE_SHEETS_WEB_APP_URL) {
    try {
      const resp = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'saveDishes',
          payload: dishes,
          idToken: idToken // Enviamos el token para validación en el script
        }),
      });
      const result = await resp.json();
      console.log('Save response:', result);
      return result.status === 'success';
    } catch (error) {
      console.error("Error saving to Google Sheets:", error);
      return false;
    }
  } else {
    // Simular un pequeño retardo
    // saveToLocalStorage(dishes);
    return true;
  }
};

export const fetchCalendar = async () => {
  if (GOOGLE_SHEETS_WEB_APP_URL) {
    try {
      const response = await fetch(`${GOOGLE_SHEETS_WEB_APP_URL}?action=getCalendar`, {
        method: 'GET',
        mode: 'cors'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching calendar:", error);
      return {};
    }
  }
  return {};
};

export const saveCalendarAssignment = async (date, breakfastId, lunchId, dinnerId, idToken) => {
  if (GOOGLE_SHEETS_WEB_APP_URL) {
    try {
      console.log("Saving assignment:", { date, breakfastId, lunchId, dinnerId });
      const resp = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'saveCalendarAssignment',
          payload: { date, breakfastId, lunchId, dinnerId },
          idToken
        }),
      });
      const result = await resp.json();
      console.log("Server response:", result);
      if (result.status !== 'success') {
        console.error("Save failed message:", result.message);
      }
      return result.status === 'success';
    } catch (error) {
      console.error("Error saving calendar assignment:", error);
      return false;
    }
  }
  return false;
};
