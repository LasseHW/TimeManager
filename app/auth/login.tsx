import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { showAlert } from '../../lib/alert';
import { t } from '../../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const trimmed = email.trim();
    if (!trimmed || !password) { showAlert('Fehler', 'Bitte E-Mail und Passwort eingeben.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    setLoading(false);
    if (error) showAlert('Login fehlgeschlagen', error.message);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.form}>
        <Text style={styles.brand}>TimeManager</Text>
        <Text style={styles.title}>Willkommen zurück</Text>
        <TextInput style={styles.input} placeholder="E-Mail" placeholderTextColor={t.textPlaceholder} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Passwort" placeholderTextColor={t.textPlaceholder} value={password} onChangeText={setPassword} secureTextEntry />
        <Pressable style={[styles.btn, loading && { opacity: 0.5 }]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Wird angemeldet...' : 'Anmelden'}</Text>
        </Pressable>
        <Link href="/auth/register" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>Noch kein Konto? <Text style={styles.linkAccent}>Registrieren</Text></Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  form: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12, maxWidth: 400, alignSelf: 'center', width: '100%' },
  brand: { fontSize: 12, fontWeight: '700', color: t.accent, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '600', color: t.text, textAlign: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: t.border, borderRadius: t.radiusInput, padding: 13, fontSize: 14, color: t.text, backgroundColor: t.card },
  btn: { backgroundColor: t.accent, borderRadius: t.radiusChip, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: t.textSecondary, fontSize: 13 },
  linkAccent: { color: t.accent, fontWeight: '600' },
});
