import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { FaApple, FaChevronDown, FaCommentSms, FaGoogle, FaMicrosoft, FaRegCalendarPlus } from 'react-icons/fa6';
import { buildIcs, googleCalendarUrl, icsFilename, inviteText, outlookCalendarUrl, smsHref } from '../lib/calendar.js';
import { track } from '../lib/analytics.js';

/* The two things you want to do with an upcoming event: put it in your
   calendar, and ask someone to come with you.

   "Add to calendar" is a disclosure button (aria-expanded + aria-controls)
   over a short list: Apple / iCal downloads a generated .ics, Google and
   Outlook open their own "new event" pages. Tab moves through it like any
   links; Escape closes it and puts focus back on the button; a click or tap
   anywhere else closes it too.

   "Text a friend" is a real sms: link, so it works with no JavaScript at
   all; where the phone offers a native share sheet we open that instead
   (more apps than Messages), and fall back to the sms: link if it fails. */

function downloadIcs(ev, url) {
  const ics = buildIcs(ev, { url });
  if (!ics) return;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = icsFilename(ev);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari reads the blob asynchronously after click(); revoke a beat later
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}

export function AddToCalendar({ ev, url }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const menuId = useId();

  const close = useCallback((refocus) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // Focus leaving the whole widget (Tab past the last item) closes it as well.
  const onBlur = (e) => {
    if (open && wrapRef.current && e.relatedTarget && !wrapRef.current.contains(e.relatedTarget)) setOpen(false);
  };

  const google = googleCalendarUrl(ev, { url });
  const outlook = outlookCalendarUrl(ev, { url });
  const picked = (kind) => {
    track('add_to_calendar', { method: kind, event_title: ev.title });
    close(false);
  };

  return (
    <div className="ev-cal" ref={wrapRef} onBlur={onBlur} data-open={open ? 'true' : 'false'}>
      <button
        ref={btnRef}
        type="button"
        className="ev-act"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <FaRegCalendarPlus aria-hidden="true" />
        <span>Add to calendar</span>
        <FaChevronDown className="ev-act__chev" aria-hidden="true" />
      </button>
      <ul className="ev-cal__menu" id={menuId} hidden={!open} aria-label={`Add ${ev.title} to your calendar`}>
        <li>
          <button
            type="button"
            className="ev-cal__item"
            onClick={() => {
              downloadIcs(ev, url);
              picked('ics');
            }}
          >
            <FaApple aria-hidden="true" /> Apple / iCal <small>(.ics)</small>
          </button>
        </li>
        <li>
          <a className="ev-cal__item" href={google} target="_blank" rel="noopener noreferrer" onClick={() => picked('google')}>
            <FaGoogle aria-hidden="true" /> Google Calendar
          </a>
        </li>
        <li>
          <a className="ev-cal__item" href={outlook} target="_blank" rel="noopener noreferrer" onClick={() => picked('outlook')}>
            <FaMicrosoft aria-hidden="true" /> Outlook.com
          </a>
        </li>
      </ul>
    </div>
  );
}

export function TextAFriend({ ev, url }) {
  const href = smsHref(ev, { url });
  const onClick = async (e) => {
    track('share_event', { event_title: ev.title });
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return; // plain sms: link
    e.preventDefault();
    try {
      await navigator.share({ title: ev.title, text: inviteText(ev), url });
    } catch (err) {
      if (err && err.name === 'AbortError') return; // they closed the sheet
      window.location.href = href;
    }
  };
  return (
    <a className="ev-act" href={href} onClick={onClick}>
      <FaCommentSms aria-hidden="true" />
      <span>Text a friend</span>
    </a>
  );
}

export default function EventActions({ ev, url }) {
  return (
    <div className="ev-actions">
      <AddToCalendar ev={ev} url={url} />
      <TextAFriend ev={ev} url={url} />
    </div>
  );
}
