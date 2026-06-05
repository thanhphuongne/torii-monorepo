interface Language {
  code: string;
  text: string;
}

// Support only Vietnamese
const languages: Language[] = [
  { code: 'vi', text: 'Tiếng Việt' },
];

const languagesMap = new Map<string, Language>();
languages.forEach((lang) => {
  languagesMap.set(lang.code, lang);
});

export { languagesMap };
export default languages;
