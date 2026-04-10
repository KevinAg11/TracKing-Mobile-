import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useLogin } from '../hooks/useLogin';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { Input } from '@/shared/ui/components/Input';

interface FormValues {
  email: string;
  password: string;
}

// ── Simple SVG-free icon placeholders using Text ──────────────────────────────
function IconUser() {
  return <Text style={styles.iconText}>👤</Text>;
}
function IconEye({ hidden }: { hidden: boolean }) {
  return <Text style={styles.iconText}>{hidden ? '🙈' : '👁️'}</Text>;
}
function IconFingerprint() {
  return <Text style={styles.iconText}>🔐</Text>;
}

export function LoginScreen() {
  const { login, isLoading, error, cooldownSeconds } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { email: '', password: '' } });

  const isDisabled = isLoading || cooldownSeconds > 0;

  const onSubmit = (data: FormValues) => {
    login(data.email, data.password);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <View style={styles.heroIllustration}>
              <Text style={styles.heroIcon}>🛵</Text>
            </View>
          </View>

          {/* ── Welcome copy ── */}
          <Text style={styles.title}>Bienvenido, Mensajero</Text>
          <Text style={styles.subtitle}>
            Ingresa tus credenciales para comenzar tu ruta de hoy.
          </Text>

          {/* ── Form ── */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              rules={{
                required: 'El usuario es requerido',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Ingresa un email válido' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Usuario"
                  placeholder="Nombre de usuario o ID"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isDisabled}
                  error={errors.email?.message}
                  rightIcon={<IconUser />}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: 'La contraseña es requerida',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Contraseña"
                  placeholder="Ingresa tu contraseña"
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isDisabled}
                  error={errors.password?.message}
                  rightIcon={<IconEye hidden={!showPassword} />}
                  onRightIconPress={() => setShowPassword((p) => !p)}
                />
              )}
            />

            {/* Forgot password */}
            <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* API error */}
            {error ? <Text style={styles.apiError}>{error}</Text> : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.button, isDisabled && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isDisabled}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : cooldownSeconds > 0 ? (
                <Text style={styles.buttonText}>Espera {cooldownSeconds}s</Text>
              ) : (
                <Text style={styles.buttonText}>Iniciar Sesión →</Text>
              )}
            </TouchableOpacity>

            {/* Biometric */}
            <View style={styles.biometricRow}>
              <TouchableOpacity style={styles.biometricBtn} activeOpacity={0.8}>
                <IconFingerprint />
              </TouchableOpacity>
              <Text style={styles.biometricLabel}>Usar huella</Text>
            </View>
          </View>

          {/* ── Footer ── */}
          <Text style={styles.footer}>v1.0.4 • Soporte Técnico</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    marginBottom: spacing.md,
  },
  heroIllustration: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  heroIcon: { fontSize: 52 },

  // Copy
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.neutral900,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.neutral500,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
    marginBottom: spacing.xxxl,
  },

  // Form
  form: { gap: 0 },
  iconText: { fontSize: 18 },

  forgotRow: { alignItems: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.xl },
  forgotText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },

  apiError: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    ...shadows.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral200,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },

  // Biometric
  biometricRow: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  biometricBtn: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  biometricLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral500,
  },

  // Footer
  footer: {
    fontSize: fontSize.xs,
    color: colors.neutral400,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});
