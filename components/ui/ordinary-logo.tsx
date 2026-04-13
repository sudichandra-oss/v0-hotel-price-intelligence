'use client';

import { useRef } from 'react';

/* Inline CSS shake keyframes — no external dependencies */
const shakeStyle = `
@keyframes shake-red-dot {
  0%   { transform: rotate(0deg)   scale(1);    }
  15%  { transform: rotate(-18deg) scale(1.15); }
  30%  { transform: rotate(14deg)  scale(1.2);  }
  45%  { transform: rotate(-10deg) scale(1.15); }
  60%  { transform: rotate(8deg)   scale(1.1);  }
  75%  { transform: rotate(-5deg)  scale(1.05); }
  90%  { transform: rotate(3deg)   scale(1.02); }
  100% { transform: rotate(0deg)   scale(1);    }
}
.red-dot-hover:hover .shake-dot {
  animation: shake-red-dot 0.55s cubic-bezier(.36,.07,.19,.97) forwards;
}
`;

export function OrdinaryLogo() {
  return (
    <>
      {/* Inject keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: shakeStyle }} />

      <div className="flex items-center gap-2 cursor-pointer red-dot-hover">
        {/* Bold black serif 'O' with red square dot beside it */}
        <div className="relative inline-flex items-end leading-none">
          <span
            className="font-black text-slate-900 select-none"
            style={{
              fontSize: '2.6rem',
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            O
          </span>

          {/* Small square red dot — bottom-right of the O */}
          <div
            className="shake-dot absolute bg-red-800 transition-colors duration-200"
            style={{
              width: '10px',
              height: '10px',
              bottom: '2px',
              right: '-8px',
              borderRadius: '2px',   /* square with tiny radius */
            }}
          />
        </div>

        <span
          className="font-black text-slate-900 ml-3"
          style={{ fontSize: '1.15rem', letterSpacing: '-0.03em' }}
        >
          ORDINARY
        </span>
      </div>
    </>
  );
}
