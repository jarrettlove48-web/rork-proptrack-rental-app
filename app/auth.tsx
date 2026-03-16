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
import { Building2, Mail, Lock, User, Eye, EyeOff, ArrowRight, KeyRound, Home, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';

type AuthMode = 'login' | 'signup' | 'forgot';
type UserRole = 'landlord' | 'tenant';
type TenantStep = 'code' | 'password';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword, isSigningIn, isSigningUp, isAuthenticated } = useAuth();
  const { checkInviteCode, verifyInviteCode } = useTenant();
  const { colors } = useTheme();
  const [role, setRole] = useState<UserRole>('landlord');
  const [mode, setMode] = useState<AuthMode>('login');
  const [tenantStep, setTenantStep] = useState<TenantStep>('code');
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
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const handleRoleSwitch = useCallback((newRole: UserRole) => {
    if (newRole === role) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.timing(slideAnim, {
      toValue: newRole === 'tenant' ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    animateTransition(() => {
      setRole(newRole);
      setMode('login');
      setTenantStep('code');
      setTenantMode('new');
      setError('');
      setEmail('');
      setPassword('');
      setName('');
      setInviteCode('');
      setCodeVerified(false);
      setVerifiedUnitInfo(null);
    });
  }, [role, animateTransition, slideAnim]);

  const switchMode = useCallback((newMode: AuthMode) => {
    animateTransition(() => {
      setMode(newMode);
      setError('');
    });
  }, [animateTransition]);

  const handleLandlordSubmit = useCallback(async () => {
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
      if (!success) setError('Invalid email or password');
    } else {
      const success = await signUp(email.trim(), password, name.trim());
      if (success) setError('');
    }
  }, [email, password, name, mode, signIn, signUp, resetPassword]);

  const handleTenantCodeSubmit = useCallback(async () => {
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
      setError('Invalid or expired invite code');
      return;
    }

    console.log('[Auth] Code verified, unit:', result.label, 'tenant:', result.tenantName);
    setCodeVerified(true);
    setVerifiedUnitInfo({ label: result.label, tenantName: result.tenantName });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    animateTransition(() => {
      setTenantStep('password');
    });
  }, [email, inviteCode, checkInviteCode, animateTransition]);

  const handleTenantPasswordSubmit = useCallback(async () => {
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
        setError('Could not create account. You may already have one — try "Returning tenant".');
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

  const landlordBg = colors.primary;
  const tenantBg = '#1A6B5C';

  const bgColor = role === 'landlord' ? landlordBg : tenantBg;

  const renderToggle = () => {
    const translateX = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, TOGGLE_HALF - 8],
    });

    return (
      <View style={styles.toggleContainer}>
        <View style={[styles.toggleTrack, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Animated.View
            style={[
              styles.toggleIndicator,
              {
                backgroundColor: 'rgba(255,255,255,0.3)',
                transform: [{ translateX }],
              },
            ]}
          />
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => handleRoleSwitch('landlord')}
            activeOpacity={0.7}
            testID="toggle-landlord"
          >
            <Building2 size={15} color={role === 'landlord' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} strokeWidth={2} />
            <Text style={[styles.toggleText, { color: role === 'landlord' ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }]}>
              Landlord
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => handleRoleSwitch('tenant')}
            activeOpacity={0.7}
            testID="toggle-tenant"
          >
            <Home size={15} color={role === 'tenant' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} strokeWidth={2} />
            <Text style={[styles.toggleText, { color: role === 'tenant' ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }]}>
              Tenant
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLandlordForm = () => (
    <Animated.View style={[styles.formCard, { backgroundColor: colors.surface, opacity: fadeAnim }]}>
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
        <TouchableOpacity style={styles.forgotLink} onPress={() => switchMode('forgot')}>
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
        onPress={handleLandlordSubmit}
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
    </Animated.View>
  );

  const renderTenantCodeForm = () => (
    <Animated.View style={[styles.formCard, { backgroundColor: colors.surface, opacity: fadeAnim }]}>
      <View style={[styles.inviteIconWrap, { backgroundColor: colors.primaryFaint }]}>
        <KeyRound size={32} color="#1A6B5C" strokeWidth={1.6} />
      </View>
      <Text style={[styles.formTitle, { color: colors.text, textAlign: 'center' }]}>Get Started</Text>
      <Text style={[styles.formSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
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
        onPress={handleTenantCodeSubmit}
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

  const renderTenantPasswordForm = () => (
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

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: '#1A6B5C' }]}
        onPress={handleTenantPasswordSubmit}
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
        <TouchableOpacity onPress={() => animateTransition(() => { setTenantStep('code'); setError(''); setCodeVerified(false); })}>
          <Text style={[styles.switchText, { color: colors.textSecondary }]}>
            Back to <Text style={{ color: '#1A6B5C', fontWeight: '600' as const }}>Invite Code</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderTenantContent = () => {
    if (isAuthenticated) {
      return renderTenantCodeForm();
    }
    if (tenantStep === 'password' && codeVerified) {
      return renderTenantPasswordForm();
    }
    return renderTenantCodeForm();
  };

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
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
              <Text style={styles.brandSubtitle}>
                {role === 'landlord' ? 'Property management, simplified' : 'Your rental portal'}
              </Text>
            </View>

            {renderToggle()}

            {role === 'landlord' ? renderLandlordForm() : renderTenantContent()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const TOGGLE_WIDTH = 280;
const TOGGLE_HALF = TOGGLE_WIDTH / 2;

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
    marginBottom: 24,
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
  toggleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleTrack: {
    width: TOGGLE_WIDTH,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  toggleIndicator: {
    position: 'absolute',
    width: TOGGLE_HALF,
    height: 40,
    borderRadius: 20,
    top: 4,
    left: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
    height: '100%',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
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
  inviteIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
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
