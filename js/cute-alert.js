// ========== CUTE ALERT - Cute Lamp სტილის ალერტი ==========

class CuteAlert {
    constructor() {
        this.overlay = null;
        this.alert = null;
        this.timeout = null;
    }
    
    /**
     * ალერტის ჩვენება
     * @param {string} message - მესიჯი
     * @param {string} type - ტიპი (success, error, warning, info)
     * @param {number} duration - ხანგრძლივობა (ms)
     * @param {string} title - სათაური (არასავალდებულო)
     */
    show(message, type = 'info', duration = 3000, title = null) {
        // ძველი ალერტის წაშლა
        this.hide();
        
        // სათაურის გენერაცია
        let alertTitle = title;
        if (!alertTitle) {
            switch(type) {
                case 'success':
                    alertTitle = 'წარმატება!';
                    break;
                case 'error':
                    alertTitle = 'შეცდომა!';
                    break;
                case 'warning':
                    alertTitle = 'გაფრთხილება!';
                    break;
                default:
                    alertTitle = 'ინფორმაცია';
            }
        }
        
        // აიკონის გენერაცია
        let icon = 'fas fa-info-circle';
        switch(type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            case 'info':
                icon = 'fas fa-info-circle';
                break;
        }
        
        // Overlay-ის შექმნა
        this.overlay = document.createElement('div');
        this.overlay.className = 'cute-alert-overlay';
        
        // ალერტის შექმნა
        this.alert = document.createElement('div');
        this.alert.className = `cute-alert ${type}`;
        
        this.alert.innerHTML = `
            <button class="cute-alert-close">
                <i class="fas fa-times"></i>
            </button>
            <div class="cute-alert-icon">
                <i class="${icon}"></i>
            </div>
            <div class="cute-alert-title">${alertTitle}</div>
            <div class="cute-alert-message">${message}</div>
            <button class="cute-alert-button">კარგი</button>
        `;
        
        this.overlay.appendChild(this.alert);
        document.body.appendChild(this.overlay);
        
        // ანიმაციის დამატება
        setTimeout(() => {
            this.overlay.classList.add('show');
        }, 10);
        
        // დახურვის ღილაკის ივენთი
        const closeBtn = this.alert.querySelector('.cute-alert-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // OK ღილაკის ივენთი
        const okBtn = this.alert.querySelector('.cute-alert-button');
        okBtn.addEventListener('click', () => this.hide());
        
        // Overlay-ზე დაჭერა
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // ავტომატური გაქრობა
        if (duration > 0) {
            this.timeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
    }
    
    /**
     * წარმატების ალერტი
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }
    
    /**
     * შეცდომის ალერტი
     */
    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }
    
    /**
     * გაფრთხილების ალერტი
     */
    warning(message, duration = 3500) {
        this.show(message, 'warning', duration);
    }
    
    /**
     * ინფორმაციის ალერტი
     */
    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
    
    /**
     * ალერტის დამალვა
     */
    hide() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        
        if (this.overlay) {
            this.overlay.classList.remove('show');
            
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                this.overlay = null;
                this.alert = null;
            }, 300);
        }
    }
}

// გლობალური ინსტანსის შექმნა
const cuteAlert = new CuteAlert();

// მოხერხებულობისთვის გლობალური ფუნქციები
function showSuccess(message, duration) {
    cuteAlert.success(message, duration);
}

function showError(message, duration) {
    cuteAlert.error(message, duration);
}

function showWarning(message, duration) {
    cuteAlert.warning(message, duration);
}

function showInfo(message, duration) {
    cuteAlert.info(message, duration);
}