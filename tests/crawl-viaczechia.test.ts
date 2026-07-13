import { describe, expect, it } from "vitest";

import { parseListing } from "@/lib/crawl-viaczechia";

function row(
  name: string,
  usek: string,
  etapa: string,
  km: string,
  href: string,
  dms: string,
): string {
  return `<tr>
    <td>${name}</td><td>${usek}</td><td>${etapa}</td><td>${km}</td>
    <td><a href="${href}">${dms}</a></td>
  </tr>`;
}

function page(rows: string[]): string {
  return `<article><table>
    <tr><td><h3>Jižní stezka</h3></td></tr>
    <tr><td>Název útulny</td><td>Úsek</td><td>Etapa</td><td>Km</td><td>Poloha</td></tr>
    ${rows.join("\n")}
  </table></article>`;
}

const TECHORAZE_DMS = `48°36'1.831"N, 14°20'12.628"E`;

describe("parseListing", () => {
  it("merges rows with the same mapy.cz link into one place", () => {
    const places = parseListing(
      page([
        row("Útulna Alfa", "Šumava", "10", "100,0", "https://mapy.cz/s/aaa", TECHORAZE_DMS),
        row("Útulna Alfa", "Šumava", "11", "110,0", "https://mapy.cz/s/aaa", TECHORAZE_DMS),
      ]),
    );
    expect(places).toHaveLength(1);
    expect(places[0].occurrences).toHaveLength(2);
  });

  it("merges rows with different mapy.cz links but identical coordinates (NOC-103)", () => {
    const places = parseListing(
      page([
        row(
          "U Těchoraze",
          "Novohradské hory",
          "27",
          "627,5",
          "https://mapy.cz/s/notabetavu",
          TECHORAZE_DMS,
        ),
        row(
          "U Těchoraze",
          "Českokrumlovsko",
          "27",
          "565,7",
          "https://mapy.cz/s/nufabefala",
          TECHORAZE_DMS,
        ),
      ]),
    );
    expect(places).toHaveLength(1);
    expect(places[0].sourceUrl).toBe("https://mapy.cz/s/notabetavu");
    expect(places[0].occurrences.map((o) => o.usek)).toEqual([
      "Novohradské hory",
      "Českokrumlovsko",
    ]);
  });

  it("keeps places with distinct coordinates separate", () => {
    const places = parseListing(
      page([
        row("Útulna Alfa", "Šumava", "10", "100,0", "https://mapy.cz/s/aaa", TECHORAZE_DMS),
        row(
          "Útulna Beta",
          "Beskydy",
          "3",
          "33,0",
          "https://mapy.cz/s/bbb",
          `49°30'10.000"N, 18°20'5.000"E`,
        ),
      ]),
    );
    expect(places).toHaveLength(2);
  });
});
