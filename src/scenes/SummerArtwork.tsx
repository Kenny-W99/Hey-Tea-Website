export function SummerArtwork() {
  return (
    <div
      className="summer-art"
      aria-label="The three HEYTEA destination drinks"
    >
      <div className="art-sky" />
      <div className="sun-disc" />
      <span className="campaign-script">
        Summer is
        <br />
        not a season.
      </span>
      <div className="hero-cups">
        {(["la", "miami", "hawaii"] as const).map((city) => (
          <img
            key={city}
            className={"hero-cup " + city}
            src={"/art/" + city + "/cup.webp"}
            alt=""
          />
        ))}
      </div>
      <div className="art-caption">
        <span>Los Angeles</span>
        <i /> <span>Miami</span>
        <i /> <span>Hawaii</span>
      </div>
    </div>
  );
}
