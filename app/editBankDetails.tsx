import { supabase } from '@/lib/supabase'; // Assuming lib is in app/lib or app/(root)/lib
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const EditBankDetailsScreen = () => { // Component name kept as EditBankDetailsScreen
  const { business_id } = useLocalSearchParams<{ business_id?: string }>();
  const router = useRouter();

  const businessIdNum = Number(business_id); // Convert to number for bigint query

  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!business_id || isNaN(businessIdNum)) {
      Alert.alert("Error", "Business ID is missing or invalid. Cannot fetch bank details.");
      setIsLoading(false);
      return;
    }

    const fetchBankDetails = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('hotels') // Assuming 'hotels' table still stores bank details, or is linked via business_id
        .select('bank_name, account_name, account_number')
        .eq('id', businessIdNum)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: 'Searched item was not found'
        Alert.alert('Error fetching details', error.message);
      } else if (data) {
        setBankName(data.bank_name || '');
        setAccountName(data.account_name || '');
        setAccountNumber(data.account_number || '');
      }

      setIsLoading(false);
    };

    fetchBankDetails();
  }, [business_id]); // businessIdNum will re-evaluate if business_id changes

  const saveBankDetails = async () => {
    if (!business_id || isNaN(businessIdNum)) {
      Alert.alert("Error", "Business ID is missing or invalid. Cannot update bank details.");
      return;
    }
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      Alert.alert("Validation Error", "All fields are required and cannot be empty.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('hotels') // Assuming 'hotels' table still stores bank details, or is linked via business_id
      .update({
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
      })
      .eq('id', businessIdNum);

    setIsSaving(false);

    if (error) {
      Alert.alert('Error saving details', error.message);
    } else {
      Alert.alert('Success', 'Bank details saved!');
      // Optionally navigate back after saving
      // router.back();
    }
  };

  if (isLoading) { // Simplified loading check from the snippet
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  if (!business_id && !isLoading) {
    return <View style={styles.centered}><Text style={styles.errorText}>Error: Business ID not provided.</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.label}>Bank Name</Text>
      <TextInput style={styles.input} placeholder="Enter Bank Name" value={bankName} onChangeText={setBankName} />
      <Text style={styles.label}>Account Holder Name</Text>
      <TextInput style={styles.input} placeholder="Enter Account Holder Name" value={accountName} onChangeText={setAccountName} />
      <Text style={styles.label}>Account Number</Text>
      <TextInput style={styles.input} placeholder="Enter Account Number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" />
      <Button title={isSaving ? "Saving..." : "Save Bank Details"} onPress={saveBankDetails} disabled={isSaving} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E4EBE5', // Background color from snippet
  },
  contentContainer: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  label: { fontSize: 16, marginBottom: 8, fontWeight: 'bold', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 16, borderRadius: 5, backgroundColor: '#fff', fontSize: 16 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center' },
});

export default EditBankDetailsScreen;