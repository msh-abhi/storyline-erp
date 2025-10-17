import { Bell, Search, User } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useAppContext } from '../context/AppContext';
import { SupportedLanguage } from '../types';

export default function TopBar() {
  const { state, actions } = useAppContext();

  const currentLanguage: SupportedLanguage = (state.settings?.language || 'en') as SupportedLanguage;

  const handleLanguageChange = (lang: SupportedLanguage) => {
    if (state.settings?.id) {
      actions.updateSettings(state.settings.id, { language: lang });
    } else {
      console.warn("Settings not found, cannot update language. Consider creating default settings.");
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/60 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers, products, sales..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all duration-200 bg-white/80 backdrop-blur-sm text-slate-900 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          <LanguageSelector 
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
          
          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50/80 rounded-xl transition-all duration-200 backdrop-blur-sm">
            <Bell className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3 bg-slate-50/80 rounded-xl px-3 py-2 backdrop-blur-sm">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <User className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-700">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}