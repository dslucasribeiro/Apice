import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useUser } from '@/hooks/useUser';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSupport = () => {
    const message = encodeURIComponent('Olá, preciso de ajuda com o sistema Ápice');
    window.open(`https://api.whatsapp.com/send?phone=5591984559727&text=${message}`, '_blank');
  };

  const menuItems = [
    { name: 'Dashboard', href: '/' },
    { name: 'Alunos', href: '/alunos' },
    { name: 'Avisos', href: '/avisos' },
    { name: 'Simulados', href: '/simulados', adminOnly: true },
    { name: 'Materiais', href: '/materiais' },
    { name: 'Dúvidas', href: '/duvidas' },
    { name: 'Perfil', href: '/perfil' },
  ];

  const filteredMenuItems = user ? menuItems.filter(item => 
    user.tipo === 'Admin' || !item.adminOnly
  ) : menuItems.filter(item => !item.adminOnly);

  if (!isClient || loading) {
    return <div className="bg-gray-900 border-b border-blue-800 h-16"></div>;
  }

  if (!user) {
    return null;
  }

  return (
    <nav className="bg-gray-900 border-b border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link 
                href={user.tipo === 'Aluno' ? '/perfil' : '/'} 
                className="text-2xl font-bold text-blue-500"
              >
                Ápice
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {filteredMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === item.href ? 'bg-gray-800 text-white' : ''
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <button
                onClick={handleSupport}
                className="text-gray-300 hover:bg-gray-800 hover:text-white p-2 rounded-full"
                title="Suporte via WhatsApp"
              >
                <ChatBubbleLeftIcon className="h-6 w-6" />
              </button>
              <button
                onClick={handleSignOut}
                className="text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Sair
              </button>
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">Abrir menu principal</span>
              {!isOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-base font-medium ${
                  pathname === item.href ? 'bg-gray-800 text-white' : ''
                }`}
              >
                {item.name}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="w-full text-left text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-base font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
