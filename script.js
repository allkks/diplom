document.addEventListener('DOMContentLoaded', () => {
    let coursesData = []; 

    const catalogGrid = document.getElementById('catalogGrid');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const burgerBtn = document.getElementById('burgerBtn');
    const navMenu = document.getElementById('navMenu');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const selectedCourseName = document.getElementById('selectedCourseName');
    const courseInput = document.getElementById('courseInput');

    // 1. Мобильное бургер-меню
    if (burgerBtn && navMenu) {
        burgerBtn.addEventListener('click', () => {
            burgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                burgerBtn.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // 2. Функция рендеринга карточек курсов
    function renderCourses(courses) {
        if (!catalogGrid) return;
        catalogGrid.innerHTML = '';

        if (courses.length === 0) {
            catalogGrid.innerHTML = '<p class="no-results">Курсы в данной категории временно отсутствуют.</p>';
            return;
        }

        courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.setAttribute('data-category', course.category);

            card.innerHTML = `
                <div class="card-badge">${course.category_name}</div>
                <h3>${course.name}</h3>
                <p class="card-desc">${course.description}</p>
                <div class="card-meta">
                    <span class="duration">⏱ ${course.hours} часов</span>
                    <span class="price">${course.price} ₽</span>
                </div>
                <button class="btn btn-sm btn-primary order-btn" data-course="${course.name}">Записаться в группу</button>
            `;
            catalogGrid.appendChild(card);
        });

        initOrderButtons();
    }

    // 3. Загрузка данных из БД (Сначала ищем в localStorage, если нет — берем из JSON)
    const localCourses = localStorage.getItem('kristi_courses');
    if (localCourses) {
        coursesData = JSON.parse(localCourses);
        renderCourses(coursesData);
    } else {
        fetch('courses.json')
            .then(response => {
                if (!response.ok) throw new Error('Ошибка сети при загрузке каталога');
                return response.json();
            })
            .then(data => {
                coursesData = data;
                localStorage.setItem('kristi_courses', JSON.stringify(coursesData));
                renderCourses(coursesData);
            })
            .catch(err => {
                console.error(err);
                if (catalogGrid) {
                    catalogGrid.innerHTML = '<p class="error-msg">Не удалось загрузить каталог. Пожалуйста, обновите страницу позже.</p>';
                }
            });
    }

    // 4. Логика переключения вкладок (Фильтрация)
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');

            if (filterValue === 'all') {
                renderCourses(coursesData);
            } else {
                const filtered = coursesData.filter(course => course.category === filterValue);
                renderCourses(filtered);
            }
        });
    });

    // 5. Работа модального окна заказа
    function initOrderButtons() {
        const orderButtons = document.querySelectorAll('.order-btn, .open-modal-btn');
        orderButtons.forEach(button => {
            button.onclick = (e) => {
                e.preventDefault();
                const courseName = button.getAttribute('data-course') || 'Общая консультация';
                
                if (selectedCourseName && courseInput && modalOverlay) {
                    selectedCourseName.textContent = courseName;
                    courseInput.value = courseName;
                    modalOverlay.classList.add('active');
                }
            };
        });
    }

    if (modalCloseBtn && modalOverlay) {
        modalCloseBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        });
    }

    // 6. Асинхронная отправка форм с сохранением в локальную БД заявок
    const handleFormSubmit = (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(form);
            const object = Object.fromEntries(formData);
            const json = JSON.stringify(object);

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Отправка...';
            submitBtn.disabled = true;

            // Запись лида в локальную БД браузера (localStorage) перед отправкой
            let localLeads = JSON.parse(localStorage.getItem('kristi_leads')) || [];
            const newLead = {
                id: Date.now(),
                name: object.name,
                contact: object.contact || object.phone || 'Не указан',
                course: object.chosen_course || object.message || 'Общая консультация',
                status: 'new',
                created_at: new Date().toLocaleDateString('ru-RU') + ' в ' + new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})
            };
            localLeads.push(newLead);
            localStorage.setItem('kristi_leads', JSON.stringify(localLeads));

            // Отправка на почту через API Web3Forms
            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: json
            })
            .then(async (response) => {
                if (response.status == 200) {
                    alert('Спасибо! Ваша заявка успешно отправлена. Менеджер свяжется с вами в ближайшее время.');
                    form.reset();
                    if (modalOverlay) modalOverlay.classList.remove('active');
                } else {
                    alert('Заявка сохранена локально в БД администратора.');
                    form.reset();
                    if (modalOverlay) modalOverlay.classList.remove('active');
                }
            })
            .catch(error => {
                // Если нет интернета — заявка все равно сохранится локально!
                alert('Заявка успешно зафиксирована в локальной базе данных администратора.');
                form.reset();
                if (modalOverlay) modalOverlay.classList.remove('active');
            })
            .finally(() => {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            });
        });
    };

    handleFormSubmit('feedbackForm');
    handleFormSubmit('modalForm');
});
