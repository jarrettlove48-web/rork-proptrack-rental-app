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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Mail, Lock, User, Eye, EyeOff, ArrowRight, KeyRound, ChevronLeft, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';

type TenantStep = 'code' | 'password';

export default function TenantAuthScreen() {
  const { signIn, signUp, resetPassword, isSigningIn, isSigningUp, isAuthenticated } = useAuth();
  const { checkInviteCode, verifyInviteCode } = useTenant();
  const { colors } = useTheme();

  const [step, setStep] = useState<TenantStep>(isAuthenticated ? 'code' : 'code');
  const [tenantMode, setTenantMode] = useState<'new' | 'returning'>('new');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifiedUnitInfo, setVerifiedUnitInfo] = useState<{ label?: string; tenantName?: string } | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback((callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const handleCodeSubmit = useCallback(async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Please enter your invite code');
      return;
    }

    setIsVerifying(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await checkInviteCode(code);
    setIsVerifying(false);

    if (!result.valid) {
      setError(result.errorDetail || 'Invalid or expired invite code');
      return;
    }

    console.log('[TenantAuth] Code verified, unit:', result.label, 'tenant:', result.tenantName);
    setCodeVerified(true);
    setVerifiedUnitInfo({ label: result.label, tenantName: result.tenantName });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    animateTransition(() => {
      setStep('password');
    });
  }, [email, inviteCode, checkInviteCode, animateTransition]);

  const handlePasswordSubmit = useCallback(async () => {
    setError('');
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    if (tenantMode === 'new' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsVerifying(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let authSuccess = false;
    if (tenantMode === 'returning') {
      authSuccess = await signIn(email.trim(), password);
      if (!authSuccess) {
        setIsVerifying(false);
        setError('Invalid password. Try again or switch to "New here".');
        return;
      }
    } else {
      authSuccess = await signUp(email.trim(), password, name.trim() || email.trim().split('@')[0]);
      if (!authSuccess) {
        setIsVerifying(false);
        setError('Could not create account. You may already have one \u2014 try "Returning tenant".');
        return;
      }
    }

    const code = inviteCode.trim().toUpperCase();
    const linkSuccess = await verifyInviteCode(code);
    setIsVerifying(false);

    if (!linkSuccess) {
      Alert.alert('Code Error', 'Your account was created but we could not link the invite code. Please try entering the code again from the tenant portal.');
    }
  }, [email, password, name, inviteCode, tenantMode, signIn, signUp, verifyInviteCode]);

  const isSubmitting = isSigningIn || isSigningUp || isVerifying;

  const renderCodeScreen = () => (
    <Animated.View style={[styles.formCard, { backgroundColor: colors.surface, opacity: fadeAnim }]}>
      <View style={[styles.inviteIconWrap, { backgroundColor: colors.primaryFaint }]}>
        <KeyRound size={32} color="#1A6B5C" strokeWidth={1.6} />
      </View>
      <Text style={[styles.formTitle, { color: colors.text }]}>Get Started</Text>
      <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
        Enter your email and the invite code your landlord sent you.
      </Text>

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
        style={[styles.submitBtn, { backgroundColor: '#1A6B5C' }]}
        onPress={handleCodeSubmit}
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

  const renderPasswordScreen = () => (
    <Animated.View style={[styles.formCard, { backgroundColor: colors.surface, opacity: fadeAnim }]}>
      {verifiedUnitInfo && (
        <View style={[styles.verifiedBanner, { backgroundColor: '#E8F5E9' }]}>
          <CheckCircle size={16} color="#2E7D32" strokeWidth={2} />
          <Text style={[styles.verifiedText, { color: '#2E7D32' }]}>
            Code verified — {verifiedUnitInfo.label}
          </Text>
        </View>
      )}

      <Text style={[styles.formTitle, { color: colors.text }]}>
        {tenantMode === 'new' ? 'Create a Password' : 'Welcome Back'}
      </Text>
      <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
        {tenantMode === 'new'
          ? 'Set a password to secure your tenant account.'
          : 'Enter your password to sign in.'}
      </Text>

      <View style={[styles.tenantModeToggle, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tenantModeOption, tenantMode === 'new' && { backgroundColor: '#1A6B5C' }]}
          onPress={() => { setTenantMode('new'); setError(''); setPassword(''); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tenantModeText, { color: tenantMode === 'new' ? '#FFFFFF' : colors.textSecondary }]}>
            New here
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tenantModeOption, tenantMode === 'returning' && { backgroundColor: '#1A6B5C' }]}
          onPress={() => { setTenantMode('returning'); setError(''); setPassword(''); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tenantModeText, { color: tenantMode === 'returning' ? '#FFFFFF' : colors.textSecondary }]}>
            Returning tenant
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.emailDisplay, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <Mail size={16} color={colors.textTertiary} strokeWidth={1.8} />
        <Text style={[styles.emailDisplayText, { color: colors.textSecondary }]} numberOfLines={1}>{email}</Text>
      </View>

      {tenantMode === 'new' && (
        <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
          <User size={18} color={colors.textTertiary} strokeWidth={1.8} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Full name (optional)"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            testID="tenant-name-input"
          />
        </View>
      )}

      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
        <Lock size={18} color={colors.textTertiary} strokeWidth={1.8} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={tenantMode === 'new' ? 'Create a password' : 'Enter your password'}
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

      {tenantMode === 'new' && (
        <Text style={[styles.passwordHint, { color: colors.textTertiary }]}>Minimum 6 characters</Text>
      )}

      {tenantMode === 'returning' && (
        <TouchableOpacity
          style={styles.forgotLink}
          onPress={() => {
            if (email.trim()) {
              void resetPassword(email.trim());
            } else {
              setError('Enter your email first, then tap Forgot Password.');
            }
          }}
        >
          <Text style={[styles.forgotLinkText, { color: '#1A6B5C' }]}>Forgot password?</Text>
        </TouchableOpacity>
      )}

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: '#1A6B5C' }]}
        onPress={handlePasswordSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
        testID="tenant-auth-submit-btn"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.submitText}>
              {tenantMode === 'new' ? 'Create Account & Enter' : 'Sign In & Enter'}
            </Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <TouchableOpacity onPress={() => animateTransition(() => { setStep('code'); setError(''); setCodeVerified(false); })}>
          <Text style={[styles.switchText, { color: colors.textSecondary }]}>
            Back to <Text style={{ color: '#1A6B5C', fontWeight: '600' as const }}>Invite Code</Text>
          </Text>
        </TouchableOpacity>
      </View>
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
            {step === 'password' && (
              <TouchableOpacity style={styles.backBtn} onPress={() => animateTransition(() => { setStep('code'); setError(''); })}>
                <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            <View style={styles.brandSection}>
              <View style={[styles.logoWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Building2 size={32} color="#FFFFFF" strokeWidth={1.6} />
              </View>
              <Text style={styles.brandTitle}>PropTrack</Text>
              <Text style={styles.brandSubtitle}>Your rental portal</Text>
            </View>

            {step === 'password' && codeVerified ? renderPasswordScreen() : renderCodeScreen()}
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
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
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
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  tenantModeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  tenantModeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantModeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emailDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  emailDisplayText: {
    fontSize: 14,
    flex: 1,
  },
  passwordHint: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 12,
    marginLeft: 4,
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
  helpSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -4,
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
