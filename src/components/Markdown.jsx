import ReactMarkdown from 'react-markdown';

/* Safe markdown rendering for owner-entered rich text. react-markdown does NOT
   render raw HTML by default, so this is XSS-safe for untrusted-ish admin input.
   Links open in a new tab when external. */
export default function Markdown({ children }) {
  if (!children) return null;
  return (
    <div className="prose">
      <ReactMarkdown
        components={{
          a: ({ href, children: c }) => {
            const external = href && /^https?:\/\//.test(href);
            return external ? (
              <a href={href} target="_blank" rel="noopener noreferrer">{c}</a>
            ) : (
              <a href={href}>{c}</a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
