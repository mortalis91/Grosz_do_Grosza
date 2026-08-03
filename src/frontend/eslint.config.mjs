import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    rules: {
      // Dane są ładowane po zmianie widoku/filtra i aktualizują stan w efekcie.
      "react-hooks/set-state-in-effect": "off",
      // Wykresy budują sumy pomocnicze podczas renderowania.
      "react-hooks/immutability": "off",
    },
  },
];
