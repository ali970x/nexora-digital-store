// Generated from messages/* AuthEmails. Do not edit manually.
export const authEmailCatalogs = {
  ar: {
    verify: {
      subject: 'أكد حسابك في نكسورا',
      title: 'تأكيد البريد الإلكتروني',
      description: 'استخدم الرابط المحمي أدناه لإكمال إنشاء حسابك.',
      action: 'تأكيد البريد',
      expiry: 'إن لم تطلب هذا الحساب، يمكنك تجاهل الرسالة.'
    },
    magicLink: {
      subject: 'رابط الدخول الآمن إلى نكسورا',
      title: 'تابع إلى نكسورا',
      description: 'يسجّل هذا الرابط الدخول لمرة واحدة دون كلمة مرور.',
      action: 'دخول آمن',
      expiry: 'تنتهي صلاحية الرابط تلقائياً لحمايتك.'
    },
    passwordReset: {
      subject: 'إعادة تعيين كلمة مرور نكسورا',
      title: 'اختر كلمة مرور جديدة',
      description: 'استخدم الرابط المحمي أدناه لتعيين كلمة مرور جديدة.',
      action: 'إعادة تعيين كلمة المرور',
      expiry: 'إن لم تطلب التغيير، أمّن حسابك فوراً.'
    }
  },
  en: {
    verify: {
      subject: 'Verify your Nexora account',
      title: 'Confirm your email',
      description: 'Use the protected link below to finish creating your account.',
      action: 'Verify email',
      expiry: 'If you did not request this account, you can ignore this email.'
    },
    magicLink: {
      subject: 'Your Nexora secure sign-in link',
      title: 'Continue to Nexora',
      description: 'This single-use link signs you in without a password.',
      action: 'Sign in securely',
      expiry: 'The link expires automatically for your protection.'
    },
    passwordReset: {
      subject: 'Reset your Nexora password',
      title: 'Choose a new password',
      description: 'Use the protected link below to set a new password.',
      action: 'Reset password',
      expiry: 'If you did not request this change, secure your account immediately.'
    }
  }
} as const;
