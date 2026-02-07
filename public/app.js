document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('application-form');
    const successState = document.getElementById('success-state');
    const submitBtn = form.querySelector('.submit-btn');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const inviteCode = document.getElementById('invite-code').value.trim();

        let hasErrors = false;

        if (!name) {
            showError('name', 'Required');
            hasErrors = true;
        }

        if (!email || !isValidEmail(email)) {
            showError('email', 'Valid email required');
            hasErrors = true;
        }

        if (!inviteCode) {
            showError('invite-code', 'Partner code required');
            hasErrors = true;
        }

        if (hasErrors) return;

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    invite_code: inviteCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Application failed');
            }

            form.style.display = 'none';
            successState.classList.add('visible');

        } catch (error) {
            if (error.message.toLowerCase().includes('code')) {
                showError('invite-code', error.message);
            } else if (error.message.toLowerCase().includes('email')) {
                showError('email', error.message);
            } else {
                showError('invite-code', error.message);
            }
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    function showError(fieldId, message) {
        const input = document.getElementById(fieldId);
        input.classList.add('error');

        let errorEl = input.parentElement.querySelector('.error-message');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'error-message';
            input.parentElement.appendChild(errorEl);
        }
        errorEl.textContent = message;
        errorEl.classList.add('visible');
    }

    function clearErrors() {
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(el => el.classList.remove('visible'));
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});
