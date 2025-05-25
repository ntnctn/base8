document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
  
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  let currentFilter = 'all';
  
  // Инициализация приложения
  function init() {
    renderTasks();
    registerServiceWorker();
    setupNotificationButton();
  }
  
  // Регистрация Service Worker
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
        })
        .catch(err => {
          console.log('ServiceWorker registration failed: ', err);
        });
    }
  }
  
  // Настройка кнопки уведомлений
  function setupNotificationButton() {
    if (!('Notification' in window) || !('PushManager' in window)) {
      enableNotificationsBtn.style.display = 'none';
      return;
    }
    
    enableNotificationsBtn.addEventListener('click', () => {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          subscribeToPushNotifications();
        }
      });
    });
  }
  
  // Подписка на push-уведомления
  function subscribeToPushNotifications() {
    navigator.serviceWorker.ready
      .then(registration => {
        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BOEQSjdhorIf8M0XFNlwohK3sTzO9iJwvbYU-fuXRF0tvRpPPMGO6d_gJC_pUQwBT7wD8rKutpNTFHOHN3VqJ0A'
          )
        });
      })
      .then(subscription => {
        fetch('/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(subscription)
        });
        
        enableNotificationsBtn.textContent = 'Уведомления включены';
        enableNotificationsBtn.disabled = true;
      })
      .catch(err => {
        console.error('Failed to subscribe to push notifications:', err);
      });
  }
  
  // Вспомогательная функция для преобразования ключа
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
  
  // Добавление новой задачи
  function addTask() {
    const text = taskInput.value.trim();
    if (text) {
      const newTask = {
        id: Date.now(),
        text,
        completed: false,
        createdAt: new Date().toISOString()
      };
      
      tasks.push(newTask);
      saveTasks();
      renderTasks();
      taskInput.value = '';
      
      // Отправка уведомления о новой задаче
      if (Notification.permission === 'granted') {
        sendNotification('Новая задача', `Добавлена: "${text}"`);
      }
    }
  }
  
  // Сохранение задач в localStorage
  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
  
  // Отображение задач
  function renderTasks() {
    taskList.innerHTML = '';
    
    const filteredTasks = tasks.filter(task => {
      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'completed') return task.completed;
      return true;
    });
    
    if (filteredTasks.length === 0) {
      taskList.innerHTML = '<li class="empty-message">Нет задач для отображения</li>';
      return;
    }
    
    filteredTasks.forEach(task => {
      const taskItem = document.createElement('li');
      taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
      taskItem.dataset.id = task.id;
      
      taskItem.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <span class="task-text">${task.text}</span>
        <button class="delete-btn">Удалить</button>
      `;
      
      taskList.appendChild(taskItem);
      
      // Обработчики событий
      const checkbox = taskItem.querySelector('.task-checkbox');
      const deleteBtn = taskItem.querySelector('.delete-btn');
      
      checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
      deleteBtn.addEventListener('click', () => deleteTask(task.id));
    });
  }
  
  // Переключение статуса задачи
  function toggleTaskCompletion(id) {
    tasks = tasks.map(task => 
      task.id === id ? {...task, completed: !task.completed} : task
    );
    saveTasks();
    renderTasks();
  }
  
  // Удаление задачи
  function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
  }
  
  // Отправка уведомления
  function sendNotification(title, body) {
    fetch('/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body })
    });
  }
  
  // Обработчики событий
  addTaskBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });
  
  // Запуск приложения
  init();
  
  // Напоминание о невыполненных задачах каждые 2 часа
  setInterval(() => {
    const activeTasks = tasks.filter(task => !task.completed);
    if (activeTasks.length > 0 && Notification.permission === 'granted') {
      sendNotification(
        'Незавершенные задачи', 
        `У вас есть ${activeTasks.length} невыполненных задач!`
      );
    }
  }, 2 * 60 * 60 * 1000); // 2 часа
});