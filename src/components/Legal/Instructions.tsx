
import type { TranslationContent } from '../../translations';

// Добавили lang сюда
export const Instructions = ({ t, lang, onClose }: { t: TranslationContent; lang: string; onClose: () => void }) => {
  const steps = [
    { icon: '📝', data: t.howItWorks.step1 },
    { icon: '📱', data: t.howItWorks.step2 },
    { icon: '💎', data: t.howItWorks.step3 },
    { icon: '🎁', data: t.howItWorks.step4 },
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--bg-color)', zIndex: 1100, padding: '20px', overflowY: 'auto',
      color: 'var(--text-main)' // Добавил цвет текста на всякий случай
    }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <button onClick={onClose} style={{
          padding: '10px 20px', borderRadius: '12px', border: 'none',
          background: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer'
        }}>
          ✕
        </button>

        <h2 style={{ textAlign: 'center', margin: '30px 0' }}>{t.howItWorks.title}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: '15px', padding: '20px',
              background: 'var(--card-bg)', borderRadius: '20px',
              alignItems: 'center', border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '40px' }}>{step.icon}</span>
              <div>
                <strong style={{ display: 'block', fontSize: '16px', marginBottom: '4px' }}>
                  {step.data.t}
                </strong>
                <span style={{ fontSize: '13px', opacity: 0.7 }}>{step.data.d}</span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          width: '100%', marginTop: '30px', padding: '15px',
          background: 'var(--accent-blue)', color: 'white',
          border: 'none', borderRadius: '15px', fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          {lang === 'fi' ? 'SELVÄ! 🚀' : lang === 'ru' ? 'ПОЕХАЛИ! 🚀' : "LET'S GO! 🚀"}
        </button>
      </div>
    </div>
  );
};