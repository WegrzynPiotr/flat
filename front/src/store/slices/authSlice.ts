import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '../../api/endpoints';
import { User } from '../../types/api';
import { storage } from '../../utils/storage';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(email, password);
      console.log('Login response:', response.data);
      const { accessToken, refreshToken, user } = response.data;
      
      if (!accessToken || !refreshToken || !user) {
        console.error('Missing data in response:', { accessToken: !!accessToken, refreshToken: !!refreshToken, user: !!user });
        return rejectWithValue('Invalid response from server');
      }
      
      await storage.setItemAsync('authToken', accessToken);
      await storage.setItemAsync('refreshToken', refreshToken);
      
      console.log('Login successful for user:', user.email);
      return { accessToken, refreshToken, user };
    } catch (error: any) {
      console.error('Login error:', error);
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(data);
      // Backend zwraca tylko message i user, bez accessToken
      // Użytkownik musi się zalogować po rejestracji
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      storage.deleteItemAsync('authToken');
      storage.deleteItemAsync('refreshToken');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        // Nie logujemy użytkownika automatycznie po rejestracji
        // Użytkownik musi się zalogować osobno
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
