/**
 * キャンセル理由の階層構造定義（最新版）
 * フロントエンド用
 */

const CancelReasons = {
  /**
   * メインカテゴリ（第1階層）
   */
  categories: [
    {
      id: 'no_contact',
      label: '1. 連絡が繋がらない'
    },
    {
      id: 'contact_lost',
      label: '2. 電話繋がったがアポ取れず、その後不通'
    },
    {
      id: 'customer_cancel_phone',
      label: '3. お客様から電話でキャンセルされた'
    },
    {
      id: 'customer_cancel_sms',
      label: '4. お客様からSMSでキャンセルされた'
    },
    {
      id: 'complaint',
      label: '5. クレーム'
    },
    {
      id: 'other',
      label: '6. その他'
    }
  ],

  /**
   * サブカテゴリと質問フロー（第2階層以降）
   */
  subCategories: {
    // 1. 連絡が繋がらない
    no_contact: [
      {
        id: 'no_contact_at_all',
        label: '電話・SMS共に一度も繋がらない',
        questions: [
          {
            id: 'phone_attempts',
            label: '電話は何回くらい架けましたか？',
            type: 'number',
            required: true,
            min: 1
          },
          {
            id: 'sms_attempts',
            label: 'SMSは何回くらいしましたか？',
            type: 'number',
            required: true,
            min: 0
          }
        ]
      },
      {
        id: 'phone_connected_then_lost',
        label: '電話繋がったがアポ取れず、その後不通',
        questions: [
          {
            id: 'contact_date',
            label: 'いつ繋がりましたか？',
            type: 'datetime-local',
            required: true
          },
          {
            id: 'sms_attempts',
            label: 'SMSは何回くらいしましたか？',
            type: 'number',
            required: true,
            min: 0
          }
        ]
      },
      {
        id: 'sms_response_no_appointment',
        label: '電話は不通、SMSで返信あったがアポ取れず',
        questions: []
      },
      {
        id: 'sms_declined',
        label: '電話は不通、SMSで断られた',
        questions: [
          {
            id: 'reason_mentioned',
            label: '理由の記載はありましたか？',
            type: 'radio',
            options: ['あり', 'なし'],
            required: true,
            followUp: {
              'あり': [
                {
                  id: 'decline_detail',
                  label: '理由の詳細',
                  type: 'textarea',
                  required: true,
                  placeholder: 'SMSに記載されていた断り理由を入力してください'
                }
              ]
            }
          }
        ]
      }
    ],

    // 2. 電話繋がったがアポ取れず、その後不通
    contact_lost: [
      {
        id: 'lost_after_call',
        label: '電話繋がったがアポ取れず、その後不通',
        questions: [
          {
            id: 'contact_date',
            label: 'いつ繋がりましたか？',
            type: 'datetime-local',
            required: true
          },
          {
            id: 'sms_attempts',
            label: 'SMSは何回くらいしましたか？',
            type: 'number',
            required: true,
            min: 0
          }
        ]
      }
    ],

    // 3. お客様から電話でキャンセルされた
    customer_cancel_phone: [
      {
        id: 'contracted_with_other',
        label: '他社契約済み',
        questions: [
          {
            id: 'know_company_name',
            label: '業者名はわかりますか？',
            type: 'radio',
            options: ['YES', 'NO'],
            required: true,
            followUp: {
              'YES': [
                {
                  id: 'company_name',
                  label: '業者名',
                  type: 'text',
                  required: true,
                  placeholder: '業者名を入力してください'
                }
              ]
            }
          },
          {
            id: 'know_contract_timing',
            label: 'ご契約時期はわかりますか？',
            type: 'radio',
            options: ['YES', 'NO'],
            required: true,
            followUp: {
              'YES': [
                {
                  id: 'contract_timing',
                  label: '契約時期',
                  type: 'text',
                  required: true,
                  placeholder: '例: 配信前、配信後すぐ、1週間前など'
                }
              ]
            }
          }
        ]
      },
      {
        id: 'contracted_with_kuraberu_member',
        label: '外壁塗装くらべる加盟店で契約済み',
        questions: [
          {
            id: 'know_company_name',
            label: '業者名はわかりますか？',
            type: 'radio',
            options: ['YES', 'NO'],
            required: true,
            followUp: {
              'YES': [
                {
                  id: 'company_name',
                  label: '業者名',
                  type: 'text',
                  required: true,
                  placeholder: '加盟店の業者名を入力してください'
                }
              ]
            }
          },
          {
            id: 'know_contract_timing',
            label: 'ご契約時期はわかりますか？',
            type: 'radio',
            options: ['YES', 'NO'],
            required: true,
            followUp: {
              'YES': [
                {
                  id: 'contract_timing',
                  label: '契約時期',
                  type: 'text',
                  required: true,
                  placeholder: '例: 配信前、配信後すぐ、1週間前など'
                }
              ]
            }
          }
        ]
      },
      {
        id: 'no_application_awareness',
        label: '理由：申し込み認識なし',
        questions: [
          {
            id: 'customer_sentiment',
            label: '温度感はどうでしたか？',
            type: 'select',
            options: ['丁寧', '普通', '怒っていた', 'クレーム'],
            required: true
          }
        ]
      },
      {
        id: 'customer_reason',
        label: '理由：お客様起因',
        questions: [
          {
            id: 'specific_reason',
            label: '具体的な理由',
            type: 'radio',
            options: ['心変わり', 'その他'],
            required: true,
            followUp: {
              'その他': [
                {
                  id: 'other_detail',
                  label: '詳細ヒアリング',
                  type: 'textarea',
                  required: true,
                  placeholder: 'お客様起因の具体的な理由を入力してください'
                }
              ]
            }
          }
        ]
      },
      {
        id: 'kuraberu_staff_reason',
        label: '理由：外壁塗装くらべる担当起因',
        questions: [
          {
            id: 'specific_reason',
            label: '具体的な理由',
            type: 'radio',
            options: ['過度な営業', 'その他'],
            required: true,
            followUp: {
              'その他': [
                {
                  id: 'other_detail',
                  label: '詳細ヒアリング',
                  type: 'textarea',
                  required: true,
                  placeholder: '外壁塗装くらべる担当起因の具体的な理由を入力してください'
                }
              ]
            }
          }
        ]
      }
    ],

    // 4. お客様からSMSでキャンセルされた
    customer_cancel_sms: [
      {
        id: 'contracted_with_other',
        label: '他社契約済み',
        questions: [
          {
            id: 'company_name',
            label: '業者名はわかりますか？',
            type: 'text',
            required: false,
            placeholder: 'わかる範囲で入力してください'
          },
          {
            id: 'contract_timing',
            label: 'ご契約時期はわかりますか？',
            type: 'text',
            required: false,
            placeholder: 'わかる範囲で入力してください'
          }
        ]
      },
      {
        id: 'contracted_with_kuraberu_member',
        label: '外壁塗装くらべる加盟店で契約済み',
        questions: [
          {
            id: 'company_name',
            label: '業者名はわかりますか？',
            type: 'text',
            required: false,
            placeholder: 'わかる範囲で入力してください'
          },
          {
            id: 'contract_timing',
            label: 'ご契約時期はわかりますか？',
            type: 'text',
            required: false,
            placeholder: 'わかる範囲で入力してください'
          }
        ]
      },
      {
        id: 'no_application_awareness',
        label: '理由：申し込み認識なし',
        questions: []
      },
      {
        id: 'customer_reason',
        label: '理由：お客様起因',
        questions: [
          {
            id: 'detail',
            label: '詳細ヒアリング（心変わり等）',
            type: 'textarea',
            required: true,
            placeholder: 'お客様起因の具体的な内容を入力してください'
          }
        ]
      },
      {
        id: 'kuraberu_staff_reason',
        label: '理由：外壁塗装くらべる担当起因',
        questions: [
          {
            id: 'detail',
            label: '詳細ヒアリング',
            type: 'textarea',
            required: true,
            placeholder: '外壁塗装くらべる担当起因の具体的な内容を入力してください'
          }
        ]
      },
      {
        id: 'other',
        label: 'その他',
        questions: [
          {
            id: 'detail',
            label: '詳細ヒアリング',
            type: 'textarea',
            required: true,
            placeholder: 'その他の理由の詳細を入力してください'
          }
        ]
      }
    ],

    // 5. クレーム
    complaint: [
      {
        id: 'complaint_case',
        label: 'クレーム',
        questions: [
          {
            id: 'complaint_detail',
            label: '内容ヒアリング',
            type: 'textarea',
            required: true,
            placeholder: 'クレームの具体的な内容を入力してください'
          }
        ]
      }
    ],

    // 6. その他
    other: [
      {
        id: 'other_case',
        label: 'その他',
        questions: [
          {
            id: 'detail',
            label: '詳細ヒアリング',
            type: 'textarea',
            required: true,
            placeholder: 'その他の理由の詳細を入力してください'
          }
        ]
      }
    ]
  },

  /**
   * カテゴリIDからカテゴリ情報を取得
   */
  getCategoryById: function(categoryId) {
    return this.categories.find(cat => cat.id === categoryId);
  },

  /**
   * カテゴリIDとサブカテゴリIDから質問リストを取得
   */
  getQuestions: function(categoryId, subCategoryId) {
    const subCats = this.subCategories[categoryId];
    if (!subCats) return null;

    const subCat = subCats.find(sc => sc.id === subCategoryId);
    return subCat ? subCat.questions : null;
  },

  /**
   * カテゴリIDからサブカテゴリリストを取得
   */
  getSubCategories: function(categoryId) {
    return this.subCategories[categoryId] || [];
  }
};

// グローバルに公開
window.CancelReasons = CancelReasons;
