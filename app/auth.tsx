import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building2, Mail, Lock, User, Eye, EyeOff, ArrowRight, KeyRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword, isSigningIn, isSigningUp } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchMode = useCallback((newMode: AuthMode) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setMode(newMode);
      setError('');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const handleSubmit = useCallback(async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (mode === 'forgot') {
      await resetPassword(email.trim());
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (mode === 'login') {
      const success = await signIn(email.trim(), password);
      if (!success) {
        setError('Invalid email or password');
      }
    } else {
      const success = await signUp(email.trim(), password, name.trim());
      if (success) {
        setError('');
      }
    }
  }, [email, password, name, mode, signIn, signUp, resetPassword]);

  const isSubmitting = isSigningIn || isSigningUp;

  return (
    <View style={[styles.root, { backgroundColor: colors.primary }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.brandSection}>
              <View style={[styles.logoWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Building2 size={36} color="#FFFFFF" strokeWidth={1.6} />
              </View>
              <Text style={styles.brandTitle}>PropTrack</Text>
              <Text style={styles.brandSubtitle}>Property management, simplified</Text>
            </View>

            <Animated.View
              style={[
                styles.formCard,
                { backgroundColor: colors.surface, opacity: fadeAnim },
              ]}
            >
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
              </Text>
              <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                {mode === 'login'
                  ? 'Sign in to manage your properties'
                  : mode === 'signup'
                  ? 'Start managing your rentals today'
                  : 'Enter your email to receive a reset link'}
              </Text>

              {mode === 'signup' && (
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                  <User size={18} color={colors.textTertiary} strokeWidth={1.8} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Full name"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    testID="auth-name-input"
                  />
                </View>
              )}

              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                <Mail size={18} color={colors.textTertiary} strokeWidth={1.8} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email address"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="auth-email-input"
                />
              </View>

              {mode !== 'forgot' && (
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                  <Lock size={18} color={colors.textTertiary} strokeWidth={1.8} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Password"
                    placeholderTextColor={colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    testID="auth-password-input"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textTertiary} strokeWidth={1.8} />
                    ) : (
                      <Eye size={18} color={colors.textTertiary} strokeWidth={1.8} />
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'login' && (
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => switchMode('forgot')}
                >
                  <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
                testID="auth-submit-btn"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.switchRow}>
                {mode === 'forgot' ? (
                  <TouchableOpacity onPress={() => switchMode('login')}>
                    <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                      Back to <Text style={{ color: colors.primary, fontWeight: '600' as const }}>Sign In</Text>
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
                    <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                      {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                      <Text style={{ color: colors.primary, fontWeight: '600' as const }}>
                        {mode === 'login' ? 'Sign Up' : 'Sign In'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.tenantLink, { borderColor: colors.border }]}
                onPress={() => router.push('/tenant-auth' as never)}
                activeOpacity={0.7}
              >
                <KeyRound size={14} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                <Text style={styles.tenantLinkText}>I'm a tenant with an invite code</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  formCard: {
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
  },
  tenantLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tenantLinkText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
  },
});
