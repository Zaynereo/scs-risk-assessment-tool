export function showSuccess(message) {
    const el = document.getElementById('content-success');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

export function showError(message) {
    const el = document.getElementById('content-error');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}
