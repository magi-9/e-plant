import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ConstructionPage from '../../pages/ConstructionPage';

describe('ConstructionPage', () => {
  it('shows the Slovak maintenance message and shop link', () => {
    render(
      <MemoryRouter>
        <ConstructionPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /táto stránka je stále vo výstavbe/i }),
    ).toBeTruthy();

    expect(screen.getByText(/e-shop funguje normálne aj počas úprav/i)).toBeTruthy();

    const shopLink = screen.getByRole('link', { name: /prejsť do e-shopu/i });
    expect(shopLink.getAttribute('href')).toBe('/products');
  });
});