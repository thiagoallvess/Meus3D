"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from '@/context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const navItems = [
  {
    href: '/',
    label: 'Calculadora (1 Peça)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      </svg>
    ),
  },
  {
    href: '/kit',
    label: 'Calculadora (Kits)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
  },
  {
    href: '/filamentos',
    label: 'Cadastro de Filamentos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    ),
  },
  {
    href: '/auxiliares',
    label: 'Materiais Auxiliares',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    ),
  },
  { href: '/embalagens', label: '📦 Embalagens' },
  {
    href: '/marketplaces',
    label: 'Canais de Venda',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
  },
  {
    href: '/producao',
    label: 'Produção & Projeções',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
  },
  {
    href: '/produtos',
    label: 'Estoque de Produtos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18"></path>
      </svg>
    ),
  },
  {
    href: '/vendas',
    label: 'Registro de Vendas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
    ),
  },
  {
    href: '/curva_abc',
    label: 'Curva ABC',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M3 3v18h18" />
        <path d="M7 14l5-5 4 4 5-9" />
      </svg>
    ),
  },
  {
    href: '/curva_abc_filamentos',
    label: 'Curva ABC (Filamentos)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    ),
  },
  {
    href: '/loja',
    label: 'Página de Vendas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
    ),
  },
  {
    href: '/falhas',
    label: 'Gestão de Falhas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    ),
  },
  {
    href: '/consignados',
    label: 'Locais Consignados',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
  },
  {
    href: '/dre',
    label: 'DRE & Financeiro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
      </svg>
    ),
  },
  {
    href: '/maquinas',
    label: 'Máquinas & Manutenção',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
        <path d="M12 12v.01"></path>
        <path d="M17 12v.01"></path>
        <path d="M7 12v.01"></path>
      </svg>
    ),
  },
  {
    href: '/trabalho',
    label: 'Gestão de Trabalho',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M20 7h-3V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM9 4h6v3H9V4z"></path>
      </svg>
    ),
  },
  {
    href: '/perfil',
    label: 'Meu Perfil',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
  },
];

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-mode' : '';
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ProtectedRoute>
      {/* Animated Background */}
      <div className="bg-animation">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      <header className="header" id="header">
        <div className="header-content">
          <div className="header-left">
            <button
              className="menu-toggle"
              id="menuToggle"
              aria-label="Abrir menu principal"
              onClick={() => setDrawerOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="logo">
              <svg className="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#logoGrad)" strokeWidth="2.5" fill="none" />
                <path d="M20 8L30 14V26L20 32L10 26V14L20 8Z" fill="url(#logoGrad)" opacity="0.3" />
                <path d="M20 14L25 17.5V24.5L20 28L15 24.5V17.5L20 14Z" fill="url(#logoGrad)" opacity="0.6" />
                <defs>
                  <linearGradient id="logoGrad" x1="4" y1="2" x2="36" y2="38">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div>
                <h1>{title || "Meus 3D"}</h1>
                <p className="header-subtitle">{subtitle || "Gestão & Precificação"}</p>
              </div>
            </div>
          </div>

          <div className="header-right">
            <button
              className="btn-icon"
              id="themeToggle"
              title="Alternar tema"
              aria-label="Alternar tema"
              onClick={toggleTheme}
            >
              <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
            <button
              className="btn-icon"
              id="historyToggle"
              title="Histórico"
              aria-label="Histórico"
              onClick={() => setHistoryOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className={`badge ${historyCount > 0 ? 'visible' : ''}`} id="historyBadge">
                {historyCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">{children}</main>

      <aside className={`history-sidebar ${historyOpen ? 'open' : ''}`} id="historySidebar">
        <div className="sidebar-header">
          <h3>Histórico de Cálculos</h3>
          <button
            className="btn-icon"
            id="closeSidebar"
            aria-label="Fechar histórico"
            onClick={() => setHistoryOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="sidebar-body" id="historyList">
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p>Nenhum cálculo realizado ainda</p>
          </div>
        </div>
      </aside>
      <div
        className={`sidebar-overlay ${historyOpen ? 'visible' : ''}`}
        id="sidebarOverlay"
        onClick={() => setHistoryOpen(false)}
      ></div>

      <div className="toast-container" id="toastContainer"></div>

      <footer className="footer">
        <p>Calculadora de Precificação 3D &copy; 2026 &mdash; Desenvolvido para makers e empreendedores</p>
      </footer>

      <div
        className={`drawer-overlay ${drawerOpen ? 'visible' : ''}`}
        id="drawerOverlay"
        onClick={() => setDrawerOpen(false)}
      ></div>
      <div className={`app-drawer ${drawerOpen ? 'open' : ''}`} id="appDrawer">
        <div className="drawer-header">
          <h2>Meus 3D</h2>
          <button
            className="drawer-close"
            id="closeDrawer"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav className="drawer-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`drawer-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
          
          <button
            onClick={() => {
              setDrawerOpen(false);
              signOut();
            }}
            className="drawer-nav-item text-red-500 hover:text-red-400"
            style={{ marginTop: 'auto', borderTop: '1px solid var(--border-card)', paddingTop: '16px', background: 'transparent', textAlign: 'left' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sair (Logout)
          </button>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
