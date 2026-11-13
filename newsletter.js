const newsletterForm = document.querySelector('#newsletter-form');

newsletterForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!newsletterForm.reportValidity()) return;

  const status = document.querySelector('#newsletter-status');
  const button = newsletterForm.querySelector('button[type="submit"]');
  const fields = new FormData(newsletterForm);
  button.disabled = true;
  newsletterForm.setAttribute('aria-busy', 'true');
  status.textContent = 'Saving your signup…';

  try {
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fields.get('email'),
        consent: fields.get('consent') === 'yes',
        consentVersion: fields.get('consentVersion'),
        website: fields.get('website'),
      }),
    });
    if (!(response.headers.get('content-type') || '').includes('application/json')) {
      throw new Error('Newsletter endpoint is unavailable');
    }
    const result = await response.json();
    if (!response.ok) {
      status.textContent = typeof result.message === 'string'
        ? result.message
        : 'We could not save your signup. Please try again later.';
      return;
    }
    if (typeof result.message !== 'string') {
      throw new Error('Invalid newsletter response');
    }
    status.textContent = result.message;
    newsletterForm.reset();
  } catch {
    status.textContent = 'We could not save your signup. Please try again later or contact Emily directly.';
  } finally {
    button.disabled = false;
    newsletterForm.removeAttribute('aria-busy');
  }
});
