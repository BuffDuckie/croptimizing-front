import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '../App';

describe('My plan page', () => {
  it('shows the suggested mix, four metrics, and the water value', async () => {
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <AppShell />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Average year profit', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getAllByText('Worst 1-in-5 years').length).toBeGreaterThan(0);
    expect(screen.getByText('Water in the highest year')).toBeInTheDocument();
    expect(screen.getByText('Soil score')).toBeInTheDocument();
    expect(screen.getByText(/One more acre-foot is worth/)).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Crop mix:/ })).toHaveLength(2);
  });

  it('explains which limit to relax when nothing fits', async () => {
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <AppShell />
      </MemoryRouter>,
    );
    await screen.findByText('Average year profit', {}, { timeout: 8000 });
    const soil = screen.getAllByRole('slider', { name: 'Soil-health minimum' })[0];
    fireEvent.change(soil, { target: { value: '90' } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No crop mix fits these limits'), { timeout: 8000 });
    expect(screen.getByRole('button', { name: /Set soil minimum to/ })).toBeInTheDocument();
  });
});
