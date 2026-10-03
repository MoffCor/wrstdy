import { SEAL } from '../lib/seal.js';
import { VER } from '../lib/constants.js';
import { TextSizeMenu } from './TextSizeMenu.jsx';

export function Header({ onMenuToggle, onShowTour, onShowShortcuts, buddyOn, onToggleBuddy }) {
  return (
    <header className="hdr no-print">
      <button
        className="sb-toggle"
        aria-label="Toggle navigation menu"
        onClick={onMenuToggle}
      >
        <span aria-hidden="true">☰</span>
      </button>
      <img src={SEAL} alt="Choctaw Nation Great Seal" className="seal" />
      <div className="bn">
        <div className="bn-n">CHOCTAW NATION</div>
        <div className="bn-d">Office of Water Resource Management</div>
        <div className="bn-r" />
        <div className="bn-a">Water Rate Study Tool</div>
      </div>
      <div className="hdr-tools">
        {onShowTour && (
          <button className="hdr-btn" onClick={onShowTour} title="Take the guided tour">
            <span aria-hidden="true">🧭</span><span className="hdr-btn-l">Guide</span>
          </button>
        )}
        {onToggleBuddy && (
          <button
            className="hdr-btn"
            onClick={() => onToggleBuddy()}
            aria-pressed={!!buddyOn}
            title={buddyOn ? 'Hide Drip, the stick-figure guide (B)' : 'Show Drip, the stick-figure guide (B)'}
          >
            <span aria-hidden="true">🕺</span><span className="hdr-btn-l">Drip</span>
          </button>
        )}
        {onShowShortcuts && (
          <button className="hdr-btn" onClick={onShowShortcuts} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
            <span aria-hidden="true">⌨</span>
          </button>
        )}
        <TextSizeMenu />
        <div className="hdr-e">
          <div>FAITH ✦ FAMILY ✦ CULTURE</div>
          <div style={{ marginTop: 2 }}>v{VER}</div>
        </div>
      </div>
    </header>
  );
}
