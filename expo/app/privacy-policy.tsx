import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>PropTrack — Property Management App</Text>
        <Text style={styles.meta}>Last updated: March 2026</Text>

        <Section title="1. Introduction">
          PropTrack ("we", "our", or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, and share information when you use the PropTrack
          mobile application.
        </Section>

        <Section title="2. Information We Collect">
          We collect the following types of information:{"\n\n"}
          • <Bold>Account information:</Bold> name, email address, and phone number when you
          register.{"\n"}
          • <Bold>Property data:</Bold> property addresses, unit details, and lease information you
          enter.{"\n"}
          • <Bold>Maintenance requests:</Bold> descriptions, status updates, and photos you upload.
          {"\n"}
          • <Bold>Messages:</Bold> communications between landlords, tenants, and contractors within
          the app.{"\n"}
          • <Bold>Payment data:</Bold> subscription plan and billing information (processed by
          third-party providers).{"\n"}
          • <Bold>Usage data:</Bold> app interactions and feature usage for improving the service.
        </Section>

        <Section title="3. How We Use Your Information">
          We use collected information to:{"\n\n"}
          • Provide, operate, and improve the PropTrack service.{"\n"}
          • Enable communication between landlords, tenants, and contractors.{"\n"}
          • Process subscription payments and manage your account.{"\n"}
          • Send service-related notifications (maintenance updates, lease reminders, SMS alerts).
          {"\n"}
          • Comply with legal obligations.
        </Section>

        <Section title="4. Third-Party Services">
          PropTrack uses the following third-party services that may receive your data:{"\n\n"}
          • <Bold>Supabase</Bold> — database and authentication (supabase.com){"\n"}
          • <Bold>Stripe / RevenueCat</Bold> — subscription billing and in-app purchases{"\n"}
          • <Bold>Twilio</Bold> — SMS notifications and two-way messaging{"\n"}
          • <Bold>Resend</Bold> — transactional email delivery{"\n\n"}
          Each provider operates under its own privacy policy. We do not sell your personal data to
          third parties.
        </Section>

        <Section title="5. Camera & Photo Library Access">
          PropTrack requests access to your camera and photo library solely to allow you to attach
          photos to maintenance requests. Photos are uploaded to secure cloud storage and are only
          accessible to you, your landlord, and assigned contractors.
        </Section>

        <Section title="6. Data Retention">
          We retain your data for as long as your account is active or as needed to provide
          services. You may request deletion of your account and associated data by contacting us at
          the email below.
        </Section>

        <Section title="7. Your Rights">
          Depending on your jurisdiction, you may have the right to access, correct, or delete your
          personal data. To exercise these rights, contact us at jarrettlove48@gmail.com.
        </Section>

        <Section title="8. Children's Privacy">
          PropTrack is not intended for users under 13 years of age. We do not knowingly collect
          personal information from children.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes via the app or email.
        </Section>

        <Section title="10. Contact Us">
          For privacy-related questions or requests:{"\n\n"}
          PropTrack{"\n"}
          Email: jarrettlove48@gmail.com
        </Section>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F6F3",
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1917",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#0C8276",
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: "#78716C",
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1917",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: "#44403C",
  },
  bold: {
    fontWeight: "600",
    color: "#1C1917",
  },
});
