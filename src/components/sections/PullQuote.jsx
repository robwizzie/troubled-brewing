/* A single quotation, set large. Only ever a real one — a customer's own words
   from a review, a line from a published write-up — with who said it and
   where. No quote, no section. */
export default function PullQuote({ data = {} }) {
  const { quote = '', attribution = '', source = '' } = data;
  if (!quote.trim()) return null;
  return (
    <section className="section pg-quote">
      <div className="container-narrow">
        <figure className="pg-quote__fig">
          <blockquote className="pg-quote__text">
            <p>{quote}</p>
          </blockquote>
          {(attribution || source) && (
            <figcaption className="pg-quote__by">
              {attribution && <span className="pg-quote__who">{attribution}</span>}
              {source && <span className="pg-quote__src">{source}</span>}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
