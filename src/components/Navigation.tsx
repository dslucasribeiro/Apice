import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();
  const pathname = usePathname();
  const [userType, setUserType] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedUserType = localStorage.getItem('userType');
    if (storedUserType) {
      setUserType(storedUserType);
    } else {
      fetchUserType();
    }
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem('userType');
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSupport = () => {
    window.open('https://wa.me/5511999999999?text=Olá,%20preciso%20de%20ajuda%20com%20o%20sistema%20Ápice', '_blank');
  };

  const fetchUserType = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('user_id', user.id)
        .single();
      
      if (userData) {
        setUserType(userData.tipo);
        localStorage.setItem('userType', userData.tipo);
      }
    }
  };

  const menuItems = [
    { href: '/', label: 'Dashboard', adminOnly: true },
    { href: '/alunos', label: 'Alunos', adminOnly: true },
    { href: '/avisos', label: 'Avisos', adminOnly: false },
    { href: '/aulas', label: 'Aulas', adminOnly: false },
    { href: '/simulados', label: 'Simulados', adminOnly: false },
    { href: '/materiais', label: 'Material Didático', adminOnly: false },
    { href: '/duvidas', label: 'Dúvidas', adminOnly: false },
    { href: '/perfil', label: 'Identificação Acadêmica', adminOnly: false }
  ];

  const filteredMenuItems = isClient ? menuItems.filter(item => 
    userType === 'Admin' || !item.adminOnly
  ) : menuItems.filter(item => !item.adminOnly);

  return (
    <nav className="bg-gray-900 border-b border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-bold text-blue-500">
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
                    {item.label}
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
                {item.label}
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
