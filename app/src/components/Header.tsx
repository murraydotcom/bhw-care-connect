import type { PageName } from '../lib/useHashRoute'
import { bhwCircles } from '../assets'
import { CONTACT } from '../data/contact'
import styles from './Header.module.css'

interface HeaderProps {
  page: PageName
  onNavigate: (page: PageName) => void
  onAskUs: () => void
  themeLabel: string
  onToggleTheme: () => void
}

export function Header({ page, onNavigate, onAskUs, themeLabel, onToggleTheme }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button type="button" className={styles.brand} onClick={() => onNavigate('hub')}>
          <span className={styles.brandMark} aria-hidden="true">
            <img src={bhwCircles} alt="" />
          </span>
          <span className={styles.brandWord}>BHW Care Connect</span>
        </button>

        <nav className={styles.nav} aria-label="Main">
          <button
            type="button"
            className={styles.navLink}
            aria-current={page === 'hub' ? 'page' : undefined}
            onClick={() => onNavigate('hub')}
          >
            Home
          </button>
          <button
            type="button"
            className={styles.navLink}
            aria-current={page === 'resources' ? 'page' : undefined}
            onClick={() => onNavigate('resources')}
          >
            Resources
          </button>
          <button
            type="button"
            className={styles.navLink}
            aria-current={page === 'new-patients' ? 'page' : undefined}
            onClick={() => onNavigate('new-patients')}
          >
            New Patients
          </button>
          <button type="button" className={styles.cta} onClick={onAskUs}>
            Ask us
          </button>
          <a className={styles.portal} href={CONTACT.portalUrl}>
            Patient Portal <span aria-hidden="true">→</span>
          </a>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={onToggleTheme}
            title={themeLabel}
          >
            <span className={styles.themeDot} aria-hidden="true" />
            {themeLabel}
          </button>
        </nav>
      </div>
    </header>
  )
}
