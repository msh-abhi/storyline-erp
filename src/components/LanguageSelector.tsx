interface LanguageOption {
  code: 'en' | 'da';
  name: string;
  flag: string;
}

interface LanguageSelectorProps {
  currentLanguage: 'en' | 'da';
  onLanguageChange: (language: 'en' | 'da') => void;
}

export default function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  const languages: LanguageOption[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  ];

  return (
    <div className="flex items-center space-x-2">
      {languages.map((language) => (
        <button
          key={language.code}
          onClick={() => onLanguageChange(language.code)}
          className={`px-3 py-2 rounded-lg transition-colors ${
            currentLanguage === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
          }`}
        >
          <span className="text-lg">{language.flag}</span>
          <span className="font-medium">{language.name}</span>
        </button>
      ))}
    </div>
  );
}