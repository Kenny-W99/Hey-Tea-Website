import { useState } from "react";
import type { Recipe, City } from "../game/catalog";
import { useCamera } from "../camera/useCamera";
import { recipes } from "../game/catalog";
export function Globe({ onEnter }: { onEnter: () => void }) {
  const camera = useCamera();
  return (
    <main className="globe scene">
      <img
        className="globe-photo"
        src="/art/globe-day.webp"
        alt="A glowing transparent HEYTEA globe on a New York winter street"
      />
      <div className="snow" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <i
            key={i}
            style={{
              left: ((i * 37) % 100) + "%",
              animationDelay: -(i % 5) + "s",
              animationDuration: 5 + (i % 4) + "s",
            }}
          />
        ))}
      </div>
      <div className="globe-copy">
        <h1 tabIndex={-1}>
          Summer Is
          <br />
          <em>Not a Season.</em>
        </h1>
        <p>You don't have to wait for summer. You can create it with HEYTEA.</p>
        {camera.status === "ready" && (
          <p className="globe-hint">Point at the button and pinch to enter.</p>
        )}
        <button className="primary" onClick={onEnter}>
          Step Into Summer <span>↗</span>
        </button>
      </div>
    </main>
  );
}
export function Choose({ choose }: { choose: (c: City) => void }) {
  const [city, setCity] = useState<City>("miami"),
    r = recipes[city];
  return (
    <main className="selection scene">
      <div className="select-heading">
        <h1 tabIndex={-1}>
          Choose <em>Your Summer.</em>
        </h1>
      </div>
      <div className="phone-hero-cup" style={{ backgroundColor: r.color }}>
        <img src={"/art/" + city + "/cup.webp"} alt={r.name} />
      </div>
      <div className="counter" aria-label="Choose a destination">
        {Object.values(recipes).map((c) => (
          <button
            key={c.city}
            aria-pressed={c.city === city}
            onClick={() => setCity(c.city)}
            className={"select-cup " + c.city}
            style={{ "--tint": c.color } as React.CSSProperties}
          >
            <img src={"/art/" + c.city + "/cup.webp"} alt="" />
            <span>{c.place}</span>
            <small>{c.name}</small>
          </button>
        ))}
      </div>
      <div className="recipe-summary">
        <p>
          <strong>{r.name}</strong>
          <br />
          {r.fruits.join(" · ")} · {r.tea}
        </p>
        <button className="primary" onClick={() => choose(city)}>
          Make this drink <span>→</span>
        </button>
      </div>
    </main>
  );
}
export function Keepsake({
  recipe: r,
  final,
  onNext,
}: {
  recipe: Recipe;
  final: boolean;
  onNext: () => void;
}) {
  return (
    <main className="keepsake scene">
      <div className="postcard">
        <img
          className="postcard-world"
          src={"/art/" + r.city + "/" + (final ? 3 : 0) + "-scene.webp"}
          alt={r.stops[final ? 3 : 0].name}
        />
        <img
          className="postcard-cup"
          src={"/art/" + r.city + "/cup.webp"}
          alt={r.name}
        />
        <img
          className="postcard-pose"
          src={"/art/" + r.city + "/" + (final ? 3 : 0) + "-pose.webp"}
          alt="HEYTEA mascot"
        />
      </div>
      <div className="keepsake-copy">
        <p className="location">
          {r.place} · {r.name}
        </p>
        <h1 tabIndex={-1}>
          {final ? "Your Summer" : "You Made"}{" "}
          <em>{final ? "Is Ready." : "It!"}</em>
        </h1>
        <p>
          {final
            ? "You don't have to wait for summer. You can create it with HEYTEA."
            : r.fruits.join(" and ") +
              " with " +
              r.tea.toLowerCase() +
              ". Your drink is ready to take you to " +
              r.place +
              "."}
        </p>
        <button className="primary" onClick={onNext}>
          {final ? "Choose Another Summer" : "Explore Your Summer"}{" "}
          <span>↗</span>
        </button>
      </div>
    </main>
  );
}
