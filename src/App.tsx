/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  Utensils, 
  School as SchoolIcon, 
  Users, 
  Bell, 
  Settings, 
  Clock, 
  LogOut, 
  LogIn,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Menu as MenuIcon,
  Home as HomeIcon,
  Search,
  Cake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  UserProfile, 
  MenuItem, 
  School, 
  Notice, 
  Schedule, 
  Birthday,
  Role,
  OperationType
} from './types';
import { handleFirestoreError } from './utils/error-handler';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Context ---
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

const useAuth = () => useContext(AuthContext);

// --- Components ---
const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-sm',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    outline: 'bg-transparent border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-6 py-3 rounded-2xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, onClick, ...props }: { children: React.ReactNode; className?: string; onClick?: () => void } & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    {...props}
    onClick={onClick}
    className={cn(
      'bg-white rounded-3xl p-6 shadow-sm border border-gray-100 transition-all',
      onClick && 'cursor-pointer active:scale-[0.98] hover:shadow-md',
      className
    )}
  >
    {children}
  </div>
);

const Input = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-semibold text-gray-600 ml-1">{label}</label>
    <input
      {...props}
      className="px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50"
    />
  </div>
);

// --- Screens ---

const HomeScreen = ({ setScreen }: { setScreen: (s: string) => void }) => {
  const { profile } = useAuth();
  const [todayMenu, setTodayMenu] = useState<MenuItem | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [recentNotice, setRecentNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const today = format(new Date(), 'EEEE', { locale: ptBR });
    const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1);
    
    const menuUnsub = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      const todayItem = items.find(i => i.dayOfWeek === capitalizedToday);
      setTodayMenu(todayItem || null);
    });

    const scheduleUnsub = onSnapshot(doc(db, 'settings', 'schedule'), (doc) => {
      if (doc.exists()) setSchedule(doc.data() as Schedule);
    });

    const noticeUnsub = onSnapshot(
      query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(1)),
      (snapshot) => {
        if (!snapshot.empty) {
          setRecentNotice({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Notice);
        }
      }
    );

    return () => {
      menuUnsub();
      scheduleUnsub();
      noticeUnsub();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Olá, Equipe! 👋</h1>
        <p className="text-gray-500">Bom trabalho na cozinha hoje.</p>
      </header>

      {/* Cardápio do Dia */}
      <Card className="bg-emerald-600 text-white border-none overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-5 h-5 opacity-80" />
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Cardápio de Hoje</span>
          </div>
          {todayMenu ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold">{todayMenu.mainDish}</h2>
              <p className="text-emerald-50 opacity-90">{todayMenu.sideDish}</p>
              {todayMenu.dessert && (
                <div className="mt-2 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                  ✨ {todayMenu.dessert}
                </div>
              )}
            </div>
          ) : (
            <p className="text-emerald-100 italic">Nenhum cardápio definido para hoje.</p>
          )}
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </Card>

      {/* Horário e Avisos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card onClick={() => setScreen('schedule')} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Horário de Trabalho</h3>
            <p className="text-sm text-gray-500">
              {schedule ? `Chegada: ${schedule.arrival}` : 'Não definido'}
            </p>
          </div>
        </Card>

        <Card onClick={() => setScreen('notices')} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Avisos da Cozinha</h3>
            <p className="text-sm text-gray-500 truncate">
              {recentNotice ? recentNotice.title : 'Nenhum aviso recente'}
            </p>
          </div>
        </Card>
      </div>

      {/* Botões de Acesso Rápido */}
      <div className="flex flex-col gap-3">
        <Button onClick={() => setScreen('schools')} variant="secondary" className="w-full justify-between py-5">
          <div className="flex items-center gap-3">
            <SchoolIcon className="w-6 h-6" />
            <span>Escolas Atendidas</span>
          </div>
          <ChevronRight className="w-5 h-5 opacity-50" />
        </Button>
        <Button onClick={() => setScreen('schools')} variant="secondary" className="w-full justify-between py-5">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <span>Quantidade de Alunos</span>
          </div>
          <ChevronRight className="w-5 h-5 opacity-50" />
        </Button>
        <Button onClick={() => setScreen('birthdays')} variant="secondary" className="w-full justify-between py-5">
          <div className="flex items-center gap-3">
            <Cake className="w-6 h-6" />
            <span>Aniversariantes do Mês</span>
          </div>
          <ChevronRight className="w-5 h-5 opacity-50" />
        </Button>
      </div>
    </div>
  );
};

const MenuScreen = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      setMenu(items);
    });
    return unsub;
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Cardápio da Semana</h1>
        <p className="text-gray-500">Organização das refeições diárias.</p>
      </header>

      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const item = menu.find(m => m.dayOfWeek === day);
          return (
            <Card key={day} className="border-l-4 border-l-emerald-500">
              <h3 className="text-emerald-700 font-bold text-sm uppercase tracking-wider mb-2">{day}</h3>
              {item ? (
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-bold text-gray-900">{item.mainDish}</p>
                  <p className="text-gray-600">{item.sideDish}</p>
                  {item.dessert && (
                    <p className="text-sm text-emerald-600 font-medium mt-1">✨ {item.dessert}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm">Cardápio não cadastrado</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const ScheduleScreen = () => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'schedule'), (doc) => {
      if (doc.exists()) setSchedule(doc.data() as Schedule);
    });
    return unsub;
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Horário de Trabalho</h1>
        <p className="text-gray-500">Cronograma da equipe de produção.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <LogIn className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chegada no Setor</p>
            <p className="text-2xl font-bold text-gray-900">{schedule?.arrival || '--:--'}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Utensils className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Início da Produção</p>
            <p className="text-2xl font-bold text-gray-900">{schedule?.productionStart || '--:--'}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
            <LogOut className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Horário de Saída</p>
            <p className="text-2xl font-bold text-gray-900">{schedule?.departure || '--:--'}</p>
          </div>
        </Card>

        {schedule?.specialNote && (
          <Card className="bg-amber-50 border-amber-200">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-amber-900">Aviso Importante</p>
                <p className="text-amber-800 text-sm mt-1">{schedule.specialNote}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

const SchoolsScreen = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'schools'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));
      setSchools(items);
    });
    return unsub;
  }, []);

  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Alunos por Escola</h1>
        <p className="text-gray-500">Quantidade de refeições por turno.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Buscar escola..."
          className="w-full pl-12 pr-4 py-4 rounded-3xl border border-gray-100 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-4">
        {filteredSchools.length > 0 ? (
          filteredSchools.map((school) => (
            <Card key={school.id}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">{school.name}</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-3 rounded-2xl text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Matutino</p>
                  <p className="text-xl font-bold text-emerald-600">{school.morningCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Vespertino</p>
                  <p className="text-xl font-bold text-emerald-600">{school.afternoonCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Noturno</p>
                  <p className="text-xl font-bold text-emerald-600">{school.nightCount}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total de Alunos</span>
                <span className="text-lg font-bold text-gray-900">
                  {school.morningCount + school.afternoonCount + school.nightCount}
                </span>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma escola encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BirthdaysScreen = () => {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const currentMonth = format(new Date(), 'MMMM', { locale: ptBR });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'birthdays'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Birthday));
      // Sort by day
      items.sort((a, b) => a.day - b.day);
      setBirthdays(items);
    });
    return unsub;
  }, []);

  const monthBirthdays = birthdays.filter(b => 
    b.month.toLowerCase() === currentMonth.toLowerCase()
  );

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Aniversariantes</h1>
        <p className="text-gray-500">Comemorações de {currentMonth}.</p>
      </header>

      <div className="flex flex-col gap-4">
        {monthBirthdays.length > 0 ? (
          monthBirthdays.map((birthday) => (
            <Card key={birthday.id} className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <span className="text-xl font-bold">{birthday.day}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{birthday.name}</h3>
                {birthday.role && <p className="text-sm text-gray-500">{birthday.role}</p>}
              </div>
              <Cake className="w-6 h-6 text-emerald-500 opacity-20" />
            </Card>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Cake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum aniversariante este mês.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NoticesScreen = () => {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notices'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice));
        setNotices(items);
      }
    );
    return unsub;
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Avisos da Cozinha</h1>
        <p className="text-gray-500">Comunicados importantes para a equipe.</p>
      </header>

      <div className="flex flex-col gap-4">
        {notices.length > 0 ? (
          notices.map((notice) => (
            <Card key={notice.id} className="relative overflow-hidden">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 text-lg">{notice.title}</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded-full">
                    {format(notice.createdAt.toDate(), 'dd/MM HH:mm')}
                  </span>
                </div>
                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{notice.content}</p>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum aviso no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminScreen = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'menu' | 'schools' | 'schedule' | 'notices' | 'birthdays'>('menu');
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
          <Settings className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500">Você não tem permissão para acessar o painel administrativo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Administração</h1>
        <p className="text-gray-500">Gerencie as informações do aplicativo.</p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'menu', label: 'Cardápio', icon: Utensils },
          { id: 'schools', label: 'Escolas', icon: SchoolIcon },
          { id: 'schedule', label: 'Horários', icon: Clock },
          { id: 'notices', label: 'Avisos', icon: Bell },
          { id: 'birthdays', label: 'Aniversários', icon: Cake },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all',
              activeTab === tab.id 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-white text-gray-600 border border-gray-200'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        {activeTab === 'menu' && <AdminMenu />}
        {activeTab === 'schools' && <AdminSchools />}
        {activeTab === 'schedule' && <AdminSchedule />}
        {activeTab === 'notices' && <AdminNotices />}
        {activeTab === 'birthdays' && <AdminBirthdays />}
      </div>
    </div>
  );
};

// --- Admin Sub-components ---

const AdminMenu = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menu'), (snapshot) => {
      setMenu(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await setDoc(doc(db, 'menu', editing.id || editing.dayOfWeek), {
        dayOfWeek: editing.dayOfWeek,
        mainDish: editing.mainDish,
        sideDish: editing.sideDish || '',
        dessert: editing.dessert || ''
      });
      setEditing(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'menu');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {days.map(day => {
        const item = menu.find(m => m.dayOfWeek === day);
        return (
          <Card key={day} className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-emerald-700 text-xs uppercase">{day}</h4>
              <p className="font-medium text-gray-900">{item?.mainDish || 'Não definido'}</p>
            </div>
            <Button 
              variant="ghost" 
              className="p-2 rounded-full"
              onClick={() => setEditing(item || { id: '', dayOfWeek: day, mainDish: '' })}
            >
              <Edit2 className="w-5 h-5" />
            </Button>
          </Card>
        );
      })}

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Editar {editing.dayOfWeek}</h3>
                <button onClick={() => setEditing(null)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Input 
                  label="Prato Principal" 
                  value={editing.mainDish || ''} 
                  onChange={e => setEditing({...editing, mainDish: e.target.value})}
                  required
                />
                <Input 
                  label="Acompanhamento" 
                  value={editing.sideDish || ''} 
                  onChange={e => setEditing({...editing, sideDish: e.target.value})}
                />
                <Input 
                  label="Bebida / Sobremesa" 
                  value={editing.dessert || ''} 
                  onChange={e => setEditing({...editing, dessert: e.target.value})}
                />
                <Button type="submit" className="mt-4">Salvar Alterações</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminSchools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [editing, setEditing] = useState<Partial<School> | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'schools'), (snapshot) => {
      setSchools(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name) return;
    try {
      const id = editing.id || doc(collection(db, 'schools')).id;
      await setDoc(doc(db, 'schools', id), {
        name: editing.name,
        morningCount: Number(editing.morningCount) || 0,
        afternoonCount: Number(editing.afternoonCount) || 0,
        nightCount: Number(editing.nightCount) || 0
      });
      setEditing(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'schools');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta escola?')) return;
    try {
      await deleteDoc(doc(db, 'schools', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'schools');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setEditing({ name: '', morningCount: 0, afternoonCount: 0, nightCount: 0 })} className="w-full">
        <Plus className="w-5 h-5" /> Adicionar Escola
      </Button>

      {schools.map(school => (
        <Card key={school.id} className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-gray-900">{school.name}</h4>
            <p className="text-xs text-gray-500">Total: {school.morningCount + school.afternoonCount + school.nightCount} alunos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="p-2" onClick={() => setEditing(school)}>
              <Edit2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" className="p-2 text-rose-500" onClick={() => handleDelete(school.id)}>
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </Card>
      ))}

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">{editing.id ? 'Editar Escola' : 'Nova Escola'}</h3>
                <button onClick={() => setEditing(null)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Input 
                  label="Nome da Escola" 
                  value={editing.name || ''} 
                  onChange={e => setEditing({...editing, name: e.target.value})}
                  required
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input 
                    label="Matutino" 
                    type="number"
                    value={editing.morningCount ?? 0} 
                    onChange={e => setEditing({...editing, morningCount: parseInt(e.target.value) || 0})}
                  />
                  <Input 
                    label="Vespertino" 
                    type="number"
                    value={editing.afternoonCount ?? 0} 
                    onChange={e => setEditing({...editing, afternoonCount: parseInt(e.target.value) || 0})}
                  />
                  <Input 
                    label="Noturno" 
                    type="number"
                    value={editing.nightCount ?? 0} 
                    onChange={e => setEditing({...editing, nightCount: parseInt(e.target.value) || 0})}
                  />
                </div>
                <Button type="submit" className="mt-4">Salvar Escola</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminSchedule = () => {
  const [schedule, setSchedule] = useState<Schedule>({ arrival: '', productionStart: '', departure: '', specialNote: '' });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'schedule'), (doc) => {
      if (doc.exists()) setSchedule(doc.data() as Schedule);
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'schedule'), schedule);
      alert('Horários atualizados com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/schedule');
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <Input 
          label="Horário de Chegada" 
          type="time"
          value={schedule.arrival || ''} 
          onChange={e => setSchedule({...schedule, arrival: e.target.value})}
        />
        <Input 
          label="Início da Produção" 
          type="time"
          value={schedule.productionStart || ''} 
          onChange={e => setSchedule({...schedule, productionStart: e.target.value})}
        />
        <Input 
          label="Horário de Saída" 
          type="time"
          value={schedule.departure || ''} 
          onChange={e => setSchedule({...schedule, departure: e.target.value})}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-600 ml-1">Aviso Especial</label>
          <textarea
            className="px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50 min-h-[100px]"
            value={schedule.specialNote || ''}
            onChange={e => setSchedule({...schedule, specialNote: e.target.value})}
            placeholder="Ex: Amanhã chegar mais cedo para preparo especial."
          />
        </div>
        <Button type="submit" className="mt-2">Salvar Horários</Button>
      </Card>
    </form>
  );
};

const AdminBirthdays = () => {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [editing, setEditing] = useState<Partial<Birthday> | null>(null);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'birthdays'), (snapshot) => {
      setBirthdays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Birthday)));
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name || !editing.day || !editing.month) return;
    try {
      const id = editing.id || doc(collection(db, 'birthdays')).id;
      await setDoc(doc(db, 'birthdays', id), {
        name: editing.name,
        day: Number(editing.day),
        month: editing.month,
        role: editing.role || ''
      });
      setEditing(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'birthdays');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este aniversariante?')) return;
    try {
      await deleteDoc(doc(db, 'birthdays', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'birthdays');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setEditing({ name: '', day: 1, month: months[new Date().getMonth()], role: '' })} className="w-full">
        <Plus className="w-5 h-5" /> Adicionar Aniversariante
      </Button>

      <div className="flex flex-col gap-3">
        {birthdays.sort((a, b) => a.day - b.day).map(birthday => (
          <Card key={birthday.id} className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm">
                {birthday.day}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{birthday.name}</h4>
                <p className="text-xs text-gray-500">{birthday.month} • {birthday.role}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" className="p-2" onClick={() => setEditing(birthday)}>
                <Edit2 className="w-5 h-5" />
              </Button>
              <Button variant="ghost" className="p-2 text-rose-500" onClick={() => handleDelete(birthday.id)}>
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">{editing.id ? 'Editar Aniversariante' : 'Novo Aniversariante'}</h3>
                <button onClick={() => setEditing(null)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Input 
                  label="Nome Completo" 
                  value={editing.name || ''} 
                  onChange={e => setEditing({...editing, name: e.target.value})}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label="Dia" 
                    type="number"
                    min="1"
                    max="31"
                    value={editing.day || ''} 
                    onChange={e => setEditing({...editing, day: parseInt(e.target.value) || 1})}
                    required
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-600 ml-1">Mês</label>
                    <select
                      className="px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50"
                      value={editing.month || ''}
                      onChange={e => setEditing({...editing, month: e.target.value})}
                      required
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <Input 
                  label="Cargo / Relação" 
                  value={editing.role || ''} 
                  onChange={e => setEditing({...editing, role: e.target.value})}
                  placeholder="Ex: Funcionário, Aluno..."
                />
                <Button type="submit" className="mt-4">Salvar</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminNotices = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNotice, setNewNotice] = useState({ title: '', content: '' });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notices'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
      }
    );
    return unsub;
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) return;
    try {
      const id = doc(collection(db, 'notices')).id;
      await setDoc(doc(db, 'notices', id), {
        title: newNotice.title,
        content: newNotice.content,
        createdAt: new Date(),
        authorId: auth.currentUser?.uid
      });
      setNewNotice({ title: '', content: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notices');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este aviso?')) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notices');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <h3 className="font-bold text-gray-900">Publicar Novo Aviso</h3>
        <form onSubmit={handlePost} className="flex flex-col gap-4">
          <Input 
            label="Título" 
            value={newNotice.title || ''} 
            onChange={e => setNewNotice({...newNotice, title: e.target.value})}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-600 ml-1">Conteúdo</label>
            <textarea
              className="px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50 min-h-[100px]"
              value={newNotice.content || ''}
              onChange={e => setNewNotice({...newNotice, content: e.target.value})}
              required
            />
          </div>
          <Button type="submit">Publicar Aviso</Button>
        </form>
      </Card>

      <div className="flex flex-col gap-4">
        <h3 className="font-bold text-gray-900">Avisos Recentes</h3>
        {notices.map(notice => (
          <Card key={notice.id} className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <h4 className="font-bold text-gray-900">{notice.title}</h4>
              <p className="text-sm text-gray-500 line-clamp-2">{notice.content}</p>
            </div>
            <Button variant="ghost" className="p-2 text-rose-500" onClick={() => handleDelete(notice.id)}>
              <Trash2 className="w-5 h-5" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('home');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile({ uid: u.uid, ...docSnap.data() } as UserProfile);
        } else {
          // Default role for new users (or first user as admin)
          const isFirstAdmin = u.email === 'violaokel@gmail.com';
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            role: isFirstAdmin ? 'admin' : 'staff'
          };
          await setDoc(docRef, { email: newProfile.email, role: newProfile.role });
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-emerald-50 flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 bg-emerald-600 rounded-3xl shadow-xl flex items-center justify-center"
        >
          <Utensils className="text-white w-8 h-8" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-xl border border-emerald-100"
        >
          <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-200">
            <Utensils className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Merenda Escolar</h1>
          <p className="text-gray-500 mb-10 leading-relaxed">
            Controle de cozinha e organização da produção de merenda escolar.
          </p>
          <Button onClick={handleLogin} className="w-full py-4 text-lg">
            <LogIn className="w-5 h-5" /> Entrar com Google
          </Button>
        </motion.div>
      </div>
    );
  }

  const isAdmin = user?.email === 'violaokel@gmail.com';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-emerald-100">
        <main className="max-w-md mx-auto px-6 pt-8 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {screen === 'home' && <HomeScreen setScreen={setScreen} />}
              {screen === 'menu' && <MenuScreen />}
              {screen === 'schedule' && <ScheduleScreen />}
              {screen === 'schools' && <SchoolsScreen />}
              {screen === 'notices' && <NoticesScreen />}
              {screen === 'birthdays' && <BirthdaysScreen />}
              {screen === 'admin' && <AdminScreen />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-4 z-40">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <NavButton active={screen === 'home'} onClick={() => setScreen('home')} icon={HomeIcon} label="Início" />
            <NavButton active={screen === 'menu'} onClick={() => setScreen('menu')} icon={Utensils} label="Cardápio" />
            <NavButton active={screen === 'schools'} onClick={() => setScreen('schools')} icon={SchoolIcon} label="Escolas" />
            <NavButton active={screen === 'birthdays'} onClick={() => setScreen('birthdays')} icon={Cake} label="Níver" />
            <NavButton active={screen === 'notices'} onClick={() => setScreen('notices')} icon={Bell} label="Avisos" />
            {isAdmin ? (
              <NavButton active={screen === 'admin'} onClick={() => setScreen('admin')} icon={Settings} label="Painel" />
            ) : (
              <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-rose-500 opacity-70">
                <LogOut className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase">Sair</span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </AuthContext.Provider>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1 transition-all relative',
      active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
    )}
  >
    <Icon className={cn('w-6 h-6 transition-transform', active && 'scale-110')} />
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    {active && (
      <motion.div 
        layoutId="nav-indicator"
        className="absolute -bottom-1 w-1 h-1 bg-emerald-600 rounded-full"
      />
    )}
  </button>
);
