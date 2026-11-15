import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../i18n';
import { AppShell } from '../App';

describe('app shell', () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'));
  });

  it('shows the header, sample badge, and footer disclaimer', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Croptimizing').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Sample data' })).toBeInTheDocument();
    expect(screen.getByText(/supports your judgment/)).toBeInTheDocument();
  });

  it('switches language and the html lang attribute', async () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'ES' }));
    expect(document.documentElement.lang).toBe('es');
    expect(screen.getByText(/apoya su criterio/)).toBeInTheDocument();
  });
});
