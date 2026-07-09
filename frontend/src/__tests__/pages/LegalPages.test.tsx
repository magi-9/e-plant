import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CookieConsent from '../../components/CookieConsent';
import PrivacyPage from '../../pages/PrivacyPage';
import TermsPage from '../../pages/TermsPage';

vi.mock('../../api/settings', () => ({
  getGlobalSettings: vi.fn(async () => ({
    company_name: 'Martin Ebringer s.r.o.',
    company_street: 'Charkovská 13',
    company_city: 'Bratislava',
    company_postal_code: '841 07',
    company_state: 'Slovenská republika',
    company_ico: '52595684',
    company_dic: '2120000000',
    company_vat_id: 'SK2120000000',
    company_phone: '+421 900 000 000',
    company_email: 'info@ebringer.sk',
    warehouse_email: 'info@ebringer.sk',
  })),
}));

function renderLegalPage(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('legal pages', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('explains B2B terms, paid order confirmation, and retired ODR platform', async () => {
    renderLegalPage(<TermsPage />);

    expect(await screen.findByText(/Inšpektorát SOI pre Bratislavský kraj/i)).toBeTruthy();
    expect(screen.getByText(/objednávka s povinnosťou platby/i)).toBeTruthy();
    expect(screen.getByText(/RSO\/ODR\) bola ukončená 20\. júla 2025/i)).toBeTruthy();
  });

  it('shows operator, legal bases, and cookie consent scope in privacy policy', async () => {
    renderLegalPage(<PrivacyPage />);

    expect(await screen.findByText(/Prevádzkovateľom osobných údajov je/i)).toBeTruthy();
    expect(screen.getByText(/oprávneného záujmu na bezpečnej prevádzke e-shopu/i)).toBeTruthy();
    expect(screen.getByText(/Analytické alebo diagnostické nástroje/i)).toBeTruthy();
  });
});

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('distinguishes necessary cookies from optional analytics and diagnostics', () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    expect(screen.getByText(/nevyhnutné cookies na prihlásenie/i)).toBeTruthy();
    expect(screen.getByText(/Voliteľné analytické a diagnostické cookies/i)).toBeTruthy();
  });
});
