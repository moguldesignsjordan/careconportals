import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from "../lib/firebase";
import { User, UserRole } from '../types'; // Ensure path is correct

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Firebase Auth State with Firestore User Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Fetch extended profile (Role, Company, etc.) from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          setUser({ id: currentUser.uid, ...userSnap.data() } as User);
        } else {
          // If user exists in Auth but not DB (rare edge case for Google Login without role), handle nicely
          // For now, we assume Google Login handles the creation
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

      // If this is a new user via Google, create their DB profile
      if (!userSnap.exists()) {
        const newUser: User = {
          id: result.user.uid,
          name: result.user.displayName || 'Google User',
          email: result.user.email || '',
          role: selectedRole,
          avatar: result.user.photoURL || 'https://via.placeholder.com/150',
          company: selectedRole === UserRole.CONTRACTOR ? 'Freelance' : undefined
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
    // onAuthStateChanged handles the rest
  };

  const signupWithEmail = async (email: string, pass: string, name: string, role: UserRole) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Create Firestore Profile
    const newUser: User = {
      id: result.user.uid,
      name,
      email,
      role,
      avatar: 'https://via.placeholder.com/150',
    };
    
    await setDoc(doc(db, 'users', result.user.uid), newUser);
    setUser(newUser);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};