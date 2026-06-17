// НАСТРОЙКА ПОДКЛЮЧЕНИЯ К ОБЛАЧНОЙ БД POSTGRESQL (SUPABASE)
const DB_URL = 'https://ouynyccvvpzltacddurb.supabase.co';
const DB_KEY = 'sb_publishable_-3MbSzRabVy0g2_el2YIqw_VTsWQYbw';

document.addEventListener('DOMContentLoaded', () => {
    const catalogGrid = document.getElementById('catalogGrid');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const burgerBtn = document.getElementById('burgerBtn');
    const navMenu = document.getElementById('navMenu');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const selectedCourseName = document.getElementById('selectedCourseName');
    const courseInput = document.getElementById('courseInput');

    let coursesData = [];

    // Мобильное меню
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

    // Загрузка данных напрямую из облачной базы PostgreSQL
    function loadCoursesFromCloud() {
        fetch(`${DB_URL}/rest/v1/courses?select=*&order=id.asc`, {
            method: 'GET',
            headers: {
                'apikey': DB_KEY,
                'Authorization': 'Bearer ' + DB_KEY
            }
        })
        .then(res => res.json())
        .then(data => {
            coursesData = data;
            renderCourses(coursesData);
        })
        .catch(err => {
            console.error('Ошибка загрузки из СУБД:', err);
            catalogGrid.innerHTML = '<p class="error-msg">Ошибка подключения к СУБД.</p>';
        });
    }

    loadCoursesFromCloud();

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
        modalCloseBtn.addEventListener('click', () => { modalOverlay.classList.remove('active'); });
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.remove('active');
        });
    }

    // Отправка формы с записью в облачную БД PostgreSQL
    const handleFormSubmit = (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(form);
            const object = Object.fromEntries(formData);

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Отправка...';
            submitBtn.disabled = true;

            const newLead = {
                id: Date.now(),
                name: object.name,
                contact: object.contact || object.phone || 'Не указан',
                course: object.chosen_course || object.message || 'Общая консультация',
                status: 'new',
                created_at: new Date().toLocaleDateString('ru-RU') + ' в ' + new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})
            };

            // Запись лида напрямую в облачную таблицу "leads"
            fetch(`${DB_URL}/rest/v1/leads`, {
                method: 'POST',
                headers: {
                    'apikey': DB_KEY,
                    'Authorization': 'Bearer ' + DB_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(newLead)
            })
            .then(() => {
                alert('Спасибо! Ваша заявка успешно записана в СУБД PostgreSQL.');
                form.reset();
                if (modalOverlay) modalOverlay.classList.remove('active');
            })
            .catch(err => {
                console.error(err);
                alert('Ошибка соединения с базой данных.');
            })
            .finally(() => {
                submitBtn.textContent = 'Отправить запрос';
                submitBtn.disabled = false;
            });
        });
    };

    handleFormSubmit('feedbackForm');
    handleFormSubmit('modalForm');
});
