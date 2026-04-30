import React, { useState, useEffect } from 'react';
import { Menu, X, Plus, List, CalendarDays, RefreshCw, ChefHat, LayoutGrid, ShoppingCart, Check, AlertCircle, Info, LogOut } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { fetchDishes, saveDishes, fetchCalendar, saveCalendarAssignment } from './services/sheetService';
import { jwtDecode } from "jwt-decode";

// Configura los correos de los propietarios en el archivo .env (separados por coma)
const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS
  ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map(email => email.trim())
  : [];

function App() {
  const [activeTab, setActiveTab] = useState(1);
  const [dishes, setDishes] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // auth state
  const [toasts, setToasts] = useState([]);

  const notify = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // View state: 'home', 'add', 'list'
  const [currentView, setCurrentView] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  // Recovery of user session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('smart_menu_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing saved user", e);
      }
    }
  }, []);

  // Save user session to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('smart_menu_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('smart_menu_user');
    }
  }, [user]);

  // Load data initially
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [dishesData, calData] = await Promise.all([
          fetchDishes(),
          fetchCalendar()
        ]);
        setDishes(dishesData || []);
        setCalendarData(calData || {});
      } catch (error) {
        console.error("Error al cargar datos", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const isOwner = user && ADMIN_EMAILS.includes(user.email);

  const navigateTo = (view) => {
    setCurrentView(view);
    setMenuOpen(false);
  };

  const handleUpdateDish = async (updatedDishes) => {
    setDishes(updatedDishes);
    const success = await saveDishes(updatedDishes, user?.idToken);
    if (success) {
      notify("Catálogo actualizado", "success");
    } else {
      notify("Error al actualizar el catálogo", "error");
    }
  };

  return (
    <>
      {/* Top Bar with Hamburger */}
      <div className="top-bar">
        <button className="menu-btn" onClick={() => setMenuOpen(true)}>
          <Menu size={32} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <ChefHat size={32} color="var(--primary-color)" />
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Smart Menu</h1>
        </div>
      </div>

      {user ? (
        <p style={{ textAlign: 'center', color: 'var(--text-sub)', marginBottom: '1rem' }}>
          Hola, {user.name} {isOwner ? '(Propietario)' : '(Invitado)'}
        </p>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-sub)', marginBottom: '1rem' }}>
          Inicia sesión para poder editar (modo visualización)
        </p>
      )}

      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${menuOpen ? 'active' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Sidebar */}
      <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <button className="menu-btn" onClick={() => setMenuOpen(false)}>
          <X size={32} />
        </button>
        <ul>
          <li>
            <button onClick={() => navigateTo('home')}>
              <LayoutGrid size={24} />
              Calendario
            </button>
          </li>
          {isOwner && (

            <>
              <li>
                <button onClick={() => navigateTo('list')}>
                  <List size={24} />
                  Catálogo
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('shopping')}>
                  <ShoppingCart size={24} />
                  Lista de Compras
                </button>
              </li>
            </>

          )}
        </ul>

        <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
          {!user ? (
            <div className="sidebar-login">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '1rem' }}>Inicia sesión para editar</p>
              <GoogleLogin
                onSuccess={credentialResponse => {
                  const decoded = jwtDecode(credentialResponse.credential);
                  setUser({ ...decoded, idToken: credentialResponse.credential });
                  notify(`Bienvenido, ${decoded.name}`, 'success');
                }}
                onError={() => notify('Error al iniciar sesión', 'error')}
              />
            </div>
          ) : (
            <div className="user-profile">
              <div className="flex-center" style={{ gap: '0.75rem', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
                <img src={user.picture} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--primary-color)' }} />
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.name}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)' }}>{isOwner ? 'Administrador' : 'Invitado'}</p>
                </div>
              </div>
              <button 
                onClick={() => { setUser(null); setMenuOpen(false); notify('Sesión cerrada', 'info'); }}
                className="btn w-full flex-center" 
                style={{ gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main>
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <RefreshCw size={48} className="loader" style={{ animationTimingFunction: 'linear', marginBottom: '1rem' }} />
            <p>Cargando información...</p>
          </div>
        )}

        {!loading && currentView === 'home' && (
          <HomeDashboard
            dishes={dishes}
            calendarData={calendarData}
            setCalendarData={setCalendarData}
            isOwner={isOwner}
            user={user}
            notify={notify}
          />
        )}

        {!loading && currentView === 'calendar' && (
          <CalendarView
            dishes={dishes}
            calendarData={calendarData}
            setCalendarData={setCalendarData}
            isOwner={isOwner}
            user={user}
            notify={notify}
          />
        )}

        {!loading && currentView === 'add' && isOwner && (
          <div className="glass-panel">
            <AddDishView
              dishes={dishes}
              handleUpdateDish={handleUpdateDish}
              goHome={() => navigateTo('home')}
              notify={notify}
            />
          </div>
        )}

        {!loading && currentView === 'list' && isOwner && (
          <SelectDishesView
            dishes={dishes}
            handleUpdateDish={handleUpdateDish}
            isOwner={isOwner}
            notify={notify}
          />
        )}
        {!loading && currentView === 'shopping' && (
          <ShoppingListView
            dishes={dishes}
            calendarData={calendarData}
          />
        )}
      </main>

      {/* Toaster Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && <Check size={18} />}
            {t.type === 'error' && <AlertCircle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// Función para normalizar URLs de Google Drive y evitar bloqueos (ORB/CORS)
const normalizeImageUrl = (url) => {
  if (!url) return '';

  let fileId = '';
  if (url.includes('drive.google.com/uc')) {
    fileId = url.split('id=')[1]?.split('&')[0];
  } else if (url.includes('lh3.googleusercontent.com/d/')) {
    fileId = url.split('/d/')[1]?.split('=')[0];
  }

  if (fileId) {
    // El endpoint de thumbnail es más resiliente ante bloqueos de rastreo y ORB
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return url;
};

function HomeDashboard({ dishes, calendarData, setCalendarData, isOwner, user, notify }) {
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDishModal, setSelectedDishModal] = useState(null);
  const [assigningMealType, setAssigningMealType] = useState(null);

  const dayInfo = calendarData[selectedDateStr];

  const getDish = (id) => dishes.find(d => String(d.id) === String(id));

  const meals = [
    { type: 'Desayuno', dish: getDish(dayInfo?.desayunoId), color: '#fbbf24', currentId: dayInfo?.desayunoId },
    { type: 'Comida', dish: getDish(dayInfo?.comidaId), color: '#ef4444', currentId: dayInfo?.comidaId },
    { type: 'Cena', dish: getDish(dayInfo?.cenaId), color: '#6366f1', currentId: dayInfo?.cenaId }
  ];

  const handleAssign = async (type, dishId) => {
    if (!isOwner) return;

    const dayData = calendarData[selectedDateStr] || { desayunoId: null, comidaId: null, cenaId: null };
    const newData = { ...dayData };

    if (type === 'Desayuno') newData.desayunoId = dishId;
    if (type === 'Comida') newData.comidaId = dishId;
    if (type === 'Cena') newData.cenaId = dishId;

    const newCalendarData = { ...calendarData, [selectedDateStr]: newData };
    setCalendarData(newCalendarData);

    const success = await saveCalendarAssignment(selectedDateStr, newData.desayunoId, newData.comidaId, newData.cenaId, user?.idToken);
    if (!success) {
      notify("Error al guardar en Google Sheets. Revisa tu conexión o permisos.", "error");
      // Revertir cambio optimista si falla
      setCalendarData(calendarData);
    } else {
      notify("Plan guardado correctamente", "success");
    }
  };

  return (
    <div className="home-dashboard">
      <div className="daily-view">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--primary-color)' }}>
          Menú del {selectedDateStr === new Date().toISOString().split('T')[0] ? 'Hoy' : selectedDateStr}
        </h2>

        <div className="grid-3-col">
          {meals.map(m => (
            <div key={m.type} className="glass-panel meal-slot">
              <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ color: m.color, margin: 0 }}>{m.type}</h3>
                {isOwner && m.dish && (
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => setAssigningMealType(m.type)}
                  >
                    Cambiar
                  </button>
                )}
              </div>

              {m.dish ? (
                <div className="dish-option-card clickable-card" onClick={() => setSelectedDishModal(m.dish)}>
                  {m.dish.image && <img src={normalizeImageUrl(m.dish.image)} alt={m.dish.name} className="dish-image" loading="lazy" referrerPolicy="no-referrer" />}
                  <h4 style={{ margin: '0.5rem 0' }}>{m.dish.name}</h4>
                  <div className="badge-container">
                    {m.dish.ingredients.slice(0, 2).map((ing, i) => <span key={i} className="badge">{ing}</span>)}
                  </div>
                </div>
              ) : (
                <div
                  className="empty-slot-btn clickable-card"
                  onClick={() => isOwner && setAssigningMealType(m.type)}
                  style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '2rem', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', cursor: isOwner ? 'pointer' : 'default' }}
                >
                  <Plus size={20} style={{ marginBottom: '0.5rem' }} />
                  <div>Sin asignar</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Selección Visual Reutilizado para Home */}
      {assigningMealType && (
        <div className="modal-overlay active" onClick={() => setAssigningMealType(null)}>
          <div className="modal-content calendar-assign-modal" onClick={e => e.stopPropagation()}>
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>Seleccionar {assigningMealType}</h2>
              <button className="modal-close-btn" onClick={() => setAssigningMealType(null)}><X size={24} /></button>
            </div>

            <div className="dish-selection-grid">
              <div
                className={`dish-option-card none ${!meals.find(m => m.type === assigningMealType)?.currentId ? 'selected' : ''}`}
                onClick={() => { handleAssign(assigningMealType, null); setAssigningMealType(null); }}
              >
                <div className="empty-dish-circle">None</div>
                <span>Sin asignar</span>
              </div>

              {dishes
                .filter(d => d.tipo === assigningMealType || (!d.tipo && assigningMealType === 'Comida'))
                .map(d => (
                  <div
                    key={d.id}
                    className={`dish-option-card ${String(d.id) === String(meals.find(m => m.type === assigningMealType)?.currentId) ? 'selected' : ''}`}
                    onClick={() => { handleAssign(assigningMealType, d.id); setAssigningMealType(null); }}
                  >
                    <img src={normalizeImageUrl(d.image)} alt={d.name} className="option-img" referrerPolicy="no-referrer" />
                    <span className="option-name">{d.name}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Seleccionar otro día</h3>
        <CalendarView
          dishes={dishes}
          calendarData={calendarData}
          setCalendarData={setCalendarData}
          isOwner={isOwner}
          user={user}
          onDateSelect={(date) => setSelectedDateStr(date)}
          compact={true}
        />
      </div>

      {/* Modal Reutilizado */}
      {selectedDishModal && (
        <div className="modal-overlay active" onClick={() => setSelectedDishModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedDishModal(null)}><X size={20} /></button>
            {selectedDishModal.image && <img src={normalizeImageUrl(selectedDishModal.image)} alt={selectedDishModal.name} className="modal-img" referrerPolicy="no-referrer" />}
            <h2 style={{ color: 'var(--primary-color)' }}>{selectedDishModal.name}</h2>
            <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }}>Ingredientes:</h3>
            <ul style={{ listStylePosition: 'inside', color: 'var(--text-sub)' }}>
              {selectedDishModal.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function AddDishView({ dishes, handleUpdateDish, goHome, notify }) {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [tipo, setTipo] = useState('Comida');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Comprimir la imagen para que pase fácil al Apps Script
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImage(dataUrl);
      }
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newDish = {
      id: Date.now().toString(),
      name,
      ingredients: ingredients.split(',').map(i => i.trim()).filter(i => i),
      quincena: 0, // Al agregarlo va al pool general (listado), no a una quincena específica.
      tipo,
      image
    };

    setSaving(true);
    await handleUpdateDish([...dishes, newDish]);
    setSaving(false);

    // reset form
    setName('');
    setIngredients('');
    setImage('');
    notify('Platillo guardado correctamente en la lista general.', 'success');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 className="flex-center" style={{ gap: '0.5rem' }}>
        <Plus size={24} color="var(--primary-color)" />
        Agregar Nuevo Platillo
      </h2>
      <p style={{ color: 'var(--text-sub)', textAlign: 'center', marginBottom: '2rem' }}>
        El platillo se guardará en tu lista general, luego podrás asignarlo a una quincena.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Nombre del platillo</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="input-group">
          <label>Ingredientes (separados por coma)</label>
          <textarea rows="3" value={ingredients} onChange={e => setIngredients(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Tipo de comida</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option>Desayuno</option>
            <option>Comida</option>
            <option>Cena</option>
          </select>
        </div>
        <div className="input-group">
          <label>Foto del platillo (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--border-color)', width: '100%' }}
          />
          {image && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <img src={image} alt="Previsualización" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
              <button type="button" onClick={() => setImage('')} className="btn" style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>Quitar foto</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="btn w-full" onClick={goHome}>Cancelar</button>
          <button type="submit" className="btn btn-primary w-full" disabled={saving}>
            {saving ? <span className="loader"></span> : 'Guardar en Catálogo'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SelectDishesView({ dishes, handleUpdateDish, isOwner, notify }) {
  const [selectedDishModal, setSelectedDishModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const categories = [
    { type: 'Desayuno', color: '#fbbf24' },
    { type: 'Comida', color: '#ef4444' },
    { type: 'Cena', color: '#6366f1' }
  ];

  const getDishesByType = (type) => dishes.filter(d => d.tipo === type || (!d.tipo && type === 'Comida'));

  return (
    <div className="catalog-view">
      <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 className="flex-center" style={{ gap: '0.5rem', margin: 0 }}>
          <List size={24} color="var(--secondary-color)" />
          Catálogo de Platillos
        </h2>
        {isOwner && (
          <button className="btn btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={() => setShowAddModal(true)}>
            <Plus size={20} />
            Agregar Platillo
          </button>
        )}
      </div>

      <div className="vertical-sections-container">
        {categories.map(cat => {
          const catDishes = getDishesByType(cat.type);
          return (
            <div key={cat.type} className="glass-panel catalog-section">
              <h3 style={{ color: cat.color, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                {cat.type}s ({catDishes.length})
              </h3>

              {catDishes.length === 0 ? (
                <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '2rem' }}>No hay {cat.type.toLowerCase()}s registrados.</p>
              ) : (
                <div className="dish-list-horizontal">
                  {catDishes.map(dish => (
                    <div key={dish.id} className="dish-option-card clickable-card" onClick={() => setSelectedDishModal(dish)}>
                      {dish.image && <img src={normalizeImageUrl(dish.image)} alt={dish.name} className="dish-image" loading="lazy" referrerPolicy="no-referrer" />}
                      <div className="dish-info-compact">
                        <h4 style={{ margin: '0.5rem 0' }}>{dish.name}</h4>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal para Agregar Nuevo Platillo */}
      {showAddModal && isOwner && (
        <div className="modal-overlay active" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            <AddDishView
              dishes={dishes}
              handleUpdateDish={handleUpdateDish}
              goHome={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* Modal de Detalles del Platillo (Igual que en Home) */}
      {selectedDishModal && (
        <div className="modal-overlay active" onClick={() => setSelectedDishModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedDishModal(null)}><X size={20} /></button>
            {selectedDishModal.image && <img src={normalizeImageUrl(selectedDishModal.image)} alt={selectedDishModal.name} className="modal-img" referrerPolicy="no-referrer" />}
            <h2 style={{ color: 'var(--primary-color)' }}>{selectedDishModal.name}</h2>
            <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }}>Ingredientes:</h3>
            <ul style={{ listStylePosition: 'inside', color: 'var(--text-sub)' }}>
              {selectedDishModal.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarView({ dishes, calendarData, setCalendarData, isOwner, user, onDateSelect, compact, notify }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingDay, setEditingDay] = useState(null);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (onDateSelect) {
      onDateSelect(dateStr);
    } else {
      setEditingDay(dateStr);
    }
  };

  const getDishName = (id) => {
    const dish = dishes.find(d => String(d.id) === String(id));
    return dish ? dish.name : '';
  };

  const handleAssign = async (type, dishId) => {
    if (!isOwner) return;

    const dayData = calendarData[editingDay] || { desayunoId: null, comidaId: null, cenaId: null };
    const newData = { ...dayData };

    if (type === 'Desayuno') newData.desayunoId = dishId;
    if (type === 'Comida') newData.comidaId = dishId;
    if (type === 'Cena') newData.cenaId = dishId;

    // Optimistic update
    const newCalendarData = { ...calendarData, [editingDay]: newData };
    setCalendarData(newCalendarData);

    const success = await saveCalendarAssignment(editingDay, newData.desayunoId, newData.comidaId, newData.cenaId, user?.idToken);
    if (!success) {
      notify("Error al guardar en Google Sheets", "error");
      setCalendarData(calendarData);
    } else {
      notify("Día planificado", "success");
    }
  };

  return (
    <div className={`calendar-container ${compact ? 'compact' : ''}`}>
      <div className="calendar-header flex-center" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn" onClick={handlePrevMonth}>&lt;</button>
        <h2 style={{ margin: 0 }}>{monthNames[month]} {year}</h2>
        <button className="btn" onClick={handleNextMonth}>&gt;</button>
      </div>

      <div className="calendar-grid">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}

        {Array(firstDay).fill(null).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty"></div>
        ))}

        {Array(days).fill(null).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayInfo = calendarData[dateStr];
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div
              key={day}
              className={`calendar-day ${isToday ? 'today' : ''} ${editingDay === dateStr ? 'selected' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              <span className="day-number">{day}</span>
              <div className="day-meals">
                {dayInfo?.desayunoId && <div className="meal-dot breakfast" title={`D: ${getDishName(dayInfo.desayunoId)}`}></div>}
                {dayInfo?.comidaId && <div className="meal-dot lunch" title={`C: ${getDishName(dayInfo.comidaId)}`}></div>}
                {dayInfo?.cenaId && <div className="meal-dot dinner" title={`S: ${getDishName(dayInfo.cenaId)}`}></div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Asignación Visual */}
      {!compact && editingDay && (
        <div className="modal-overlay active" onClick={() => setEditingDay(null)}>
          <div className="modal-content calendar-assign-modal" onClick={e => e.stopPropagation()}>
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>Planificar: {editingDay}</h2>
              <button className="modal-close-btn" onClick={() => setEditingDay(null)}><X size={24} /></button>
            </div>

            <div className="visual-assignment-container">
              {['Desayuno', 'Comida', 'Cena'].map(type => {
                const currentId = type === 'Desayuno' ? calendarData[editingDay]?.desayunoId :
                  type === 'Comida' ? calendarData[editingDay]?.comidaId :
                    calendarData[editingDay]?.cenaId;

                const typeColor = type === 'Desayuno' ? '#fbbf24' : type === 'Comida' ? '#ef4444' : '#6366f1';

                return (
                  <div key={type} className="meal-type-section">
                    <h3 style={{ color: typeColor, marginBottom: '1rem' }}>{type}</h3>
                    <div className="dish-selection-grid">
                      <div
                        className={`dish-option-card none ${!currentId ? 'selected' : ''}`}
                        onClick={() => handleAssign(type, null)}
                      >
                        <div className="empty-dish-circle">None</div>
                        <span>Sin asignar</span>
                      </div>

                      {dishes
                        .filter(d => d.tipo === type || (!d.tipo && type === 'Comida'))
                        .map(d => (
                          <div
                            key={d.id}
                            className={`dish-option-card ${String(d.id) === String(currentId) ? 'selected' : ''}`}
                            onClick={() => handleAssign(type, d.id)}
                          >
                            <img src={normalizeImageUrl(d.image)} alt={d.name} className="option-img" referrerPolicy="no-referrer" />
                            <span className="option-name">{d.name}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShoppingListView({ dishes, calendarData }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [ingredientsList, setIngredientsList] = useState([]);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate(null);
      setIngredientsList([]);
    } else {
      // Si la fecha seleccionada es anterior a la de inicio, la ponemos como inicio
      if (new Date(dateStr) < new Date(startDate)) {
        setStartDate(dateStr);
      } else {
        setEndDate(dateStr);
      }
    }
  };

  const generateList = () => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const ingredients = new Set();

    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayData = calendarData[dateStr];
      
      if (dayData) {
        const mealIds = [dayData.desayunoId, dayData.comidaId, dayData.cenaId];
        mealIds.forEach(id => {
          if (id) {
            const dish = dishes.find(d => String(d.id) === String(id));
            if (dish && dish.ingredients) {
              dish.ingredients.forEach(ing => ingredients.add(ing.trim().toLowerCase()));
            }
          }
        });
      }
      current.setDate(current.getDate() + 1);
    }

    setIngredientsList(Array.from(ingredients).sort());
  };

  const isInRange = (dateStr) => {
    if (!startDate || !endDate) return false;
    const d = new Date(dateStr);
    return d >= new Date(startDate) && d <= new Date(endDate);
  };

  return (
    <div className="glass-panel shopping-view">
      <h2 className="flex-center" style={{ gap: '0.5rem', marginBottom: '2rem' }}>
        <ShoppingCart size={24} color="var(--primary-color)" />
        Lista de Compras
      </h2>

      {ingredientsList.length === 0 ? (
        <div className="range-calendar-picker">
          <div className="calendar-header flex-center" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button className="btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>&lt;</button>
            <h3 style={{ margin: 0 }}>{monthNames[month]} {year}</h3>
            <button className="btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>&gt;</button>
          </div>

          <div className="calendar-grid range-grid">
            {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => <div key={`${d}-${i}`} className="calendar-day-header">{d}</div>)}
            {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} className="calendar-day empty"></div>)}
            {Array(days).fill(null).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === startDate || dateStr === endDate;
              const inRange = isInRange(dateStr);

              return (
                <div 
                  key={day} 
                  className={`calendar-day ${isSelected ? 'selected' : ''} ${inRange ? 'in-range' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="range-info flex-center" style={{ gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
            <div className="date-badge">Desde: {startDate || '...'}</div>
            <div className="date-badge">Hasta: {endDate || '...'}</div>
            <button 
              className="btn btn-primary" 
              onClick={generateList}
              disabled={!startDate || !endDate}
            >
              Generar Lista
            </button>
          </div>
        </div>
      ) : (
        <div className="ingredients-results">
          <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>
              Ingredientes ({ingredientsList.length})
            </h3>
            <button className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setIngredientsList([])}>
              Cambiar Rango
            </button>
          </div>
          
          <div className="ingredients-grid">
            {ingredientsList.map((ing, i) => (
              <div key={i} className="ingredient-item">
                <input type="checkbox" id={`sh-ing-${i}`} />
                <label htmlFor={`sh-ing-${i}`}>{ing}</label>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-primary w-full" onClick={() => window.print()}>
              Imprimir Lista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
