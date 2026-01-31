import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from "../lib/firebase";
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          setUser({ id: currentUser.uid, ...userSnap.data() } as User);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async (selectedRole: UserRole = UserRole.CLIENT) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newUser: User = {
          id: result.user.uid,
          name: result.user.displayName || 'Google User',
          email: result.user.email || '',
          role: selectedRole,
          avatar: result.user.photoURL || 'https://via.placeholder.com/150',
          company: selectedRole === UserRole.CONTRACTOR ? 'Freelance' : undefined,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        setUser(newUser);
      }
    } catch (error) {
      console.error("Google Auth Error", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string, role: UserRole) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    
    const newUser: User = {
      id: result.user.uid,
      name,
      email,
      role,
      avatar: 'https://via.placeholder.com/150',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', result.user.uid), newUser);
    setUser(newUser);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, { ...user, ...updates }, { merge: true });
    setUser({ ...user, ...updates });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      signupWithEmail, 
      logout,
      updateUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
