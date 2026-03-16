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
import { Building2, Mail, Lock, User, Eye, EyeOff, ArrowRight, KeyRound, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';

type TenantAuthMode = 'login' | 'signup' | 'invite';

export default function TenantAuthScreen() {
  const { signIn, signUp, isSigningIn, isSigningUp, isAuthenticated } = useAuth();
  const { verifyInviteCode } = useTenant();
  const { colors } = useTheme();

  const [mode, setMode] = useState<TenantAuthMode>(isAuthenticated ? 'invite' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchMode = useCallback((newMode: TenantAuthMode) => {
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

  const handleAuthSubmit = useCallback(async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (mode === 'login') {
      const success = await signIn(email.trim(), password);
      if (success) {
        switchMode('invite');
      } else {
        setError('Invalid email or password');
      }
    } else if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      const success = await signUp(email.trim(), password, name.trim());
      if (success) {
        switchMode('invite');
      }
    }
  }, [email, password, name, mode, signIn, signUp, switchMode]);

  const handleVerifyCode = useCallback(async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Please enter a valid invite code');
      return;
    }
    setError('');
    setIsVerifying(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const success = await verifyInviteCode(code);
    setIsVerifying(false);
    if (!success) {
      setError('Invalid or expired invite code');
    }
  }, [inviteCode, verifyInviteCode]);

  const isSubmitting = isSigningIn || isSigningUp || isVerifying;

  const renderInviteScreen = () => (
    <Animated.View style={[styles.formCard, { backgroundColor: colors.surface, opacity: fadeAnim }]}>
      <View style={[styles.inviteIconWrap, { backgroundColor: colors.primaryFaint }]}>
        <KeyRound size={32} color={colors.primary} strokeWidth={1.6} />
      </View>
      <Text style={[styles.formTitle, { color: colors.text }]}>Enter Invite Code</Text>
      <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
        Your landlord sent you a 6-character code. Enter it below to access your portal.
      </Text>

      <View style={[styles.codeInputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
        <KeyRound size={18} color={colors.textTertiary} strokeWidth={1.8} />
        <TextInput
          style={[styles.codeInput, { color: colors.text }]}
          placeholder="e.g. ABC123"
          placeholderTextColor={colors.textTertiary}
          value={inviteCode}
          onChangeText={(t) => setInviteCode(t.toUpperCase())}
          autoCapitalize="characters"
          maxLength={8}
          autoCorrect={false}
          testID="invite-code-input"
        />
      </View>

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }]}
        onPress={handleVerifyCode}
        disabled={isSubmitting}
        activeOpacity={0.85}
        testID="verify-code-btn"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.submitText}>Verify & Continue</Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.helpSection}>
        <Text style={[styles.helpText, { color: colors.textTertiary }]}>
          Don't have a code? Ask your landlord to send you an invite from PropTrack.
        </Text>
      </View>
    </Animated.View>
  );

  const renderAuthScreen = () => (
    <Animated.View style={[styles.formCard, { backgroundColor: colors.surface, opacity: fadeAnim }]}>
      <Text style={[styles.formTitle, { color: colors.text }]}>
        {mode === 'login' ? 'Tenant Sign In' : 'Create Account'}
      </Text>
      <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
        {mode === 'login'
          ? 'Sign in to access your tenant portal'
          : 'Create an account, then enter your invite code'}
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
            testID="tenant-name-input"
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
          testID="tenant-email-input"
        />
      </View>

      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
        <Lock size={18} color={colors.textTertiary} strokeWidth={1.8} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          testID="tenant-password-input"
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

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }]}
        onPress={handleAuthSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
        testID="tenant-auth-submit-btn"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.submitText}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={[styles.switchText, { color: colors.textSecondary }]}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ color: colors.primary, fontWeight: '600' as const }}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'login' && (
        <TouchableOpacity
          style={[styles.haveCodeBtn, { borderColor: colors.border }]}
          onPress={() => switchMode('invite')}
          activeOpacity={0.7}
        >
          <KeyRound size={14} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.haveCodeText, { color: colors.primary }]}>I already have an account & invite code</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: '#1A6B5C' }]}>
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
            {mode === 'invite' && !isAuthenticated && (
              <TouchableOpacity style={styles.backBtn} onPress={() => switchMode('login')}>
                <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.backBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            )}

            <View style={styles.brandSection}>
              <View style={[styles.logoWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Building2 size={32} color="#FFFFFF" strokeWidth={1.6} />
              </View>
              <Text style={styles.brandTitle}>PropTrack</Text>
              <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.roleBadgeText}>Tenant Portal</Text>
              </View>
            </View>

            {(mode === 'invite' || isAuthenticated) ? renderInviteScreen() : renderAuthScreen()}
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
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
  inviteIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  codeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 16,
  },
  codeInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: 4,
    textAlign: 'center',
    padding: 0,
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
    paddingVertical: 2,
    paddingHorizontal: 0,
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
    marginTop: 4,
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
  haveCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  haveCodeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  helpSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
