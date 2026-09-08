/**
 * UnitechPay Payment Service
 * Documentation: https://pay.unitech.sn/documentation/
 * Base URL: https://api.unitech.sn/api.php
 */

const API_BASE_URL = 'https://api.unitech.sn/api.php';

export interface UnitechPayPaymentParams {
  amount: number;
  phone: string;
  description: string;
  orderReference: string;
  callbackSuccess: string;
  callbackCancel: string;
}

export interface UnitechPayIntlParams extends UnitechPayPaymentParams {
  country: 'CI' | 'TG' | 'BF' | 'BJ' | 'SN';
  operator: 'wave_money' | 'orange_money' | 'moov_money' | 'mtn_money';
  otp?: string;
}

export interface UnitechPaymentResult {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  reference?: string;
  isLive: boolean;
  message?: string;
}

function getApiKey(): string | undefined {
  return process.env.UNITECHPAY_API_KEY;
}

/**
 * Nettoie le numéro de téléphone pour ne conserver que les chiffres (9 chiffres pour le Sénégal)
 */
export function cleanSenegalPhone(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('221') && clean.length > 9) {
    clean = clean.slice(3);
  }
  return clean;
}

/**
 * 1. Initialise un paiement Wave (Sénégal)
 * Endpoint: POST /api.php?action=create_wave_payment
 */
export async function createWavePayment(
  params: UnitechPayPaymentParams
): Promise<UnitechPaymentResult> {
  const apiKey = getApiKey();
  const customerNumber = cleanSenegalPhone(params.phone);

  if (!apiKey) {
    console.warn('⚠️ UNITECHPAY_API_KEY manquant. Mode simulation actif.');
    return {
      success: true,
      isLive: false,
      reference: params.orderReference,
      transactionId: `SIM_WAVE_${Date.now()}`,
      message: 'Mode simulation actif (UNITECHPAY_API_KEY non configurée).',
    };
  }

  const payload = {
    amount: params.amount,
    customer_number: customerNumber,
    description: params.description,
    callback_success: params.callbackSuccess,
    callback_cancel: params.callbackCancel,
    reference: params.orderReference,
  };

  try {
    const response = await fetch(`${API_BASE_URL}?action=create_wave_payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success || data.status === 'success' || data.payment_url || data.data?.payment_url) {
      const paymentUrl = data.payment_url || data.data?.payment_url || data.url;
      const transactionId = data.transaction_id || data.data?.transaction_id || data.id;

      return {
        success: true,
        isLive: true,
        paymentUrl,
        transactionId,
        reference: params.orderReference,
      };
    }

    throw new Error(data.message || data.error || 'Erreur lors de la création du paiement Wave');
  } catch (error: any) {
    console.error('Erreur UnitechPay Wave:', error.message);
    throw error;
  }
}

/**
 * 2. Initialise un paiement Orange Money (Sénégal)
 * Actions possibles :
 * - create_orange_om (OM Standard)
 * - create_orange_maxit (Max It)
 * - create_orange_qr (QR Code)
 */
export async function createOrangeMoneyPayment(
  params: UnitechPayPaymentParams,
  mode: 'om' | 'maxit' | 'qr' = 'om'
): Promise<UnitechPaymentResult> {
  const apiKey = getApiKey();
  const customerNumber = cleanSenegalPhone(params.phone);

  if (!apiKey) {
    console.warn('⚠️ UNITECHPAY_API_KEY manquant. Mode simulation actif.');
    return {
      success: true,
      isLive: false,
      reference: params.orderReference,
      transactionId: `SIM_OM_${Date.now()}`,
      message: 'Mode simulation actif (UNITECHPAY_API_KEY non configurée).',
    };
  }

  const actionMap = {
    om: 'create_orange_om',
    maxit: 'create_orange_maxit',
    qr: 'create_orange_qr',
  };

  const action = actionMap[mode] || 'create_orange_om';

  const payload = {
    amount: params.amount,
    customer_number: customerNumber,
    description: params.description,
    callback_success: params.callbackSuccess,
    callback_cancel: params.callbackCancel,
    reference: params.orderReference,
  };

  try {
    const response = await fetch(`${API_BASE_URL}?action=${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success || data.status === 'success' || data.payment_url || data.data?.payment_url) {
      const paymentUrl = data.payment_url || data.data?.payment_url || data.url;
      const transactionId = data.transaction_id || data.data?.transaction_id || data.id;

      return {
        success: true,
        isLive: true,
        paymentUrl,
        transactionId,
        reference: params.orderReference,
      };
    }

    throw new Error(data.message || data.error || 'Erreur lors de la création du paiement Orange Money');
  } catch (error: any) {
    console.error('Erreur UnitechPay Orange Money:', error.message);
    throw error;
  }
}

/**
 * 3. Initialise un paiement Multi-Pays (CI, TG, BF, BJ)
 * Endpoint: POST /api.php?action=create_intl_payment
 */
export async function createIntlPayment(
  params: UnitechPayIntlParams
): Promise<UnitechPaymentResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      success: true,
      isLive: false,
      reference: params.orderReference,
      transactionId: `SIM_INTL_${Date.now()}`,
      message: 'Mode simulation actif (UNITECHPAY_API_KEY non configurée).',
    };
  }

  const payload: any = {
    country: params.country,
    operator: params.operator,
    amount: params.amount,
    customer_number: params.phone.replace(/[^0-9]/g, ''),
    description: params.description,
    callback_success: params.callbackSuccess,
    callback_cancel: params.callbackCancel,
    reference: params.orderReference,
  };

  if (params.otp) {
    payload.otp = params.otp;
  }

  try {
    const response = await fetch(`${API_BASE_URL}?action=create_intl_payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success || data.status === 'success' || data.payment_url || data.data?.payment_url) {
      return {
        success: true,
        isLive: true,
        paymentUrl: data.payment_url || data.data?.payment_url || data.url,
        transactionId: data.transaction_id || data.data?.transaction_id,
        reference: params.orderReference,
      };
    }

    throw new Error(data.message || data.error || 'Erreur lors du paiement international');
  } catch (error: any) {
    console.error('Erreur UnitechPay International:', error.message);
    throw error;
  }
}
