/**
 * キャンセル理由の階層構造定義
 *
 * 各選択肢に「その他 → 詳細ヒアリング」を含む
 * 質問フローと追加情報の収集ロジック
 */

const CancelReasons = {
  /**
   * メインカテゴリ（第1階層）
   */
  categories: [
    {
      id: 'no_contact',
      label: '1. 連絡が繋がらない',
      requiresFollowUp: true, // 追跡履歴必須
      minPhoneCalls: 3, // 最低電話回数
      minSMS: 2 // 最低SMS回数
    },
    {
      id: 'contact_lost',
      label: '2. 電話繋がったがアポ取れず、その後不通',
      requiresFollowUp: true,
      minPhoneCalls: 2,
      minSMS: 1
    },
    {
      id: 'customer_cancel_phone',
      label: '3. お客様から電話でキャンセルされた',
      requiresFollowUp: false
    },
    {
      id: 'customer_cancel_sms',
      label: '4. お客様からSMSでキャンセルされた',
      requiresFollowUp: false
    },
    {
      id: 'complaint',
      label: '5. クレーム',
      requiresFollowUp: false,
      requiresDetail: true
    }
  ],

  /**
   * サブカテゴリと質問フロー（第2階層以降）
   */
  subCategories: {
    // 1. 連絡が繋がらない
    no_contact: [
      {
        id: 'no_answer_multiple',
        label: '複数回電話したが出ない',
        questions: [
          {
            id: 'phone_count',
            label: '電話をかけた回数',
            type: 'number',
            required: true,
            validation: { min: 3 }
          },
          {
            id: 'sms_count',
            label: 'SMSを送った回数',
            type: 'number',
            required: true,
            validation: { min: 2 }
          },
          {
            id: 'last_contact_date',
            label: '最終連絡日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'sms_content',
            label: '送信したSMS内容',
            type: 'textarea',
            required: false
          }
        ]
      },
      {
        id: 'invalid_number',
        label: '番号が無効（音声ガイダンス・使われていない）',
        questions: [
          {
            id: 'guidance_message',
            label: '音声ガイダンスの内容',
            type: 'select',
            options: [
              'お客様のご都合により通話ができません',
              'おかけになった電話番号は現在使われておりません',
              '電源が入っていないか圏外です',
              'その他'
            ],
            required: true
          },
          {
            id: 'attempt_count',
            label: '確認した回数',
            type: 'number',
            required: true,
            validation: { min: 2 }
          },
          {
            id: 'last_attempt_date',
            label: '最終確認日時',
            type: 'datetime',
            required: true
          }
        ]
      },
      {
        id: 'wrong_number',
        label: '間違い電話（別人が出た）',
        questions: [
          {
            id: 'who_answered',
            label: '誰が出ましたか',
            type: 'text',
            required: false,
            placeholder: '例: 全く知らない人、前の持ち主'
          },
          {
            id: 'confirmation_count',
            label: '確認した回数',
            type: 'number',
            required: true,
            validation: { min: 2 }
          }
        ]
      },
      {
        id: 'other',
        label: 'その他',
        questions: [
          {
            id: 'detail_hearing',
            label: '詳細をお聞かせください',
            type: 'textarea',
            required: true,
            placeholder: '連絡が取れない詳しい状況を記入してください'
          }
        ]
      }
    ],

    // 2. 電話繋がったがアポ取れず、その後不通
    contact_lost: [
      {
        id: 'appointment_rejected',
        label: 'アポ取得を断られた後、不通',
        questions: [
          {
            id: 'contact_date',
            label: '電話が繋がった日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'rejection_reason',
            label: 'アポを断られた理由',
            type: 'select',
            options: [
              '忙しい・時間がない',
              '検討中・まだ決めていない',
              '他社と話している',
              '興味がなくなった',
              'その他'
            ],
            required: true
          },
          {
            id: 'customer_sentiment',
            label: 'お客様の温度感',
            type: 'select',
            options: [
              '高い（前向きだが予定が合わない）',
              '中程度（検討中）',
              '低い（あまり興味なさそう）',
              'その他'
            ],
            required: true
          },
          {
            id: 'follow_up_count',
            label: 'その後の連絡試行回数',
            type: 'number',
            required: true,
            validation: { min: 2 }
          },
          {
            id: 'last_contact_date',
            label: '最終連絡日時',
            type: 'datetime',
            required: true
          }
        ]
      },
      {
        id: 'postponed_then_lost',
        label: '後日連絡と言われたが、その後繋がらず',
        questions: [
          {
            id: 'contact_date',
            label: '電話が繋がった日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'promised_callback_date',
            label: '約束した折り返し日',
            type: 'date',
            required: false
          },
          {
            id: 'follow_up_count',
            label: '約束日以降の連絡試行回数',
            type: 'number',
            required: true,
            validation: { min: 2 }
          },
          {
            id: 'sms_count',
            label: 'SMS送信回数',
            type: 'number',
            required: true,
            validation: { min: 1 }
          },
          {
            id: 'last_contact_date',
            label: '最終連絡日時',
            type: 'datetime',
            required: true
          }
        ]
      },
      {
        id: 'other',
        label: 'その他',
        questions: [
          {
            id: 'detail_hearing',
            label: '詳細をお聞かせください',
            type: 'textarea',
            required: true,
            placeholder: 'アポが取れなかった経緯と、その後不通になった詳しい状況を記入してください'
          }
        ]
      }
    ],

    // 3. お客様から電話でキャンセルされた
    customer_cancel_phone: [
      {
        id: 'already_contracted',
        label: '既に他社で契約済み',
        questions: [
          {
            id: 'contact_date',
            label: '電話が繋がった日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'other_company',
            label: '契約した業者名',
            type: 'text',
            required: false,
            placeholder: '分かる範囲で'
          },
          {
            id: 'contract_timing',
            label: '契約時期',
            type: 'select',
            options: [
              '配信前から契約済みだった',
              '配信後すぐに契約した',
              '配信後数日で契約した',
              '不明',
              'その他'
            ],
            required: true
          },
          {
            id: 'customer_sentiment',
            label: 'お客様の対応',
            type: 'select',
            options: [
              '丁寧に断られた',
              '申し訳なさそうに断られた',
              '無愛想に断られた',
              'その他'
            ],
            required: false
          }
        ]
      },
      {
        id: 'not_interested',
        label: 'やっぱり工事しない・興味がない',
        questions: [
          {
            id: 'contact_date',
            label: '電話が繋がった日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'reason',
            label: 'キャンセル理由',
            type: 'select',
            options: [
              '費用が高そう',
              '急いでいない',
              '家族に反対された',
              '状況が変わった',
              '理由を教えてくれなかった',
              'その他'
            ],
            required: true
          },
          {
            id: 'customer_sentiment',
            label: 'お客様の温度感',
            type: 'select',
            options: [
              '高かった（理由があってキャンセル）',
              '中程度',
              '低かった（最初から興味なさそう）',
              'その他'
            ],
            required: false
          }
        ]
      },
      {
        id: 'timing_issue',
        label: 'タイミングが合わない',
        questions: [
          {
            id: 'contact_date',
            label: '電話が繋がった日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'timing_reason',
            label: '具体的な理由',
            type: 'select',
            options: [
              '今は忙しい（時期が悪い）',
              '数ヶ月後にまた考える',
              '来年度にする',
              'その他'
            ],
            required: true
          },
          {
            id: 'future_contact',
            label: '将来的な連絡希望',
            type: 'select',
            options: [
              '希望あり（時期が来たら連絡してほしい）',
              '希望なし',
              '不明',
              'その他'
            ],
            required: false
          }
        ]
      },
      {
        id: 'request_not_submitted',
        label: '自分で申し込んでいない（覚えがない）',
        questions: [
          {
            id: 'contact_date',
            label: '電話が繋がった日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'customer_reaction',
            label: 'お客様の反応',
            type: 'select',
            options: [
              '全く覚えがない',
              '家族が申し込んだかも',
              '以前見たが忘れた',
              'その他'
            ],
            required: true
          },
          {
            id: 'possible_reason',
            label: '考えられる理由',
            type: 'textarea',
            required: false,
            placeholder: '誤入力、家族が勝手に申し込んだなど'
          }
        ]
      },
      {
        id: 'other',
        label: 'その他',
        questions: [
          {
            id: 'detail_hearing',
            label: '詳細をお聞かせください',
            type: 'textarea',
            required: true,
            placeholder: 'お客様からキャンセルされた詳しい状況を記入してください'
          }
        ]
      }
    ],

    // 4. お客様からSMSでキャンセルされた
    customer_cancel_sms: [
      {
        id: 'sms_decline',
        label: 'SMSで断りの連絡が来た',
        questions: [
          {
            id: 'sms_received_date',
            label: 'SMS受信日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'sms_content',
            label: 'SMSの内容',
            type: 'textarea',
            required: true,
            placeholder: 'お客様が送ってきたSMSの内容を記入してください'
          },
          {
            id: 'decline_reason',
            label: 'キャンセル理由（SMS内容から判断）',
            type: 'select',
            options: [
              '既に他社で契約済み',
              '興味がない',
              '申し込んでいない',
              '連絡不要',
              '理由不明（単に断りのみ）',
              'その他'
            ],
            required: true
          },
          {
            id: 'follow_up_attempted',
            label: '電話で確認を試みましたか',
            type: 'select',
            options: [
              'はい（繋がった）',
              'はい（繋がらなかった）',
              'いいえ（試していない）',
              'その他'
            ],
            required: true
          }
        ]
      },
      {
        id: 'sms_already_contracted',
        label: 'SMSで他社契約済みと連絡が来た',
        questions: [
          {
            id: 'sms_received_date',
            label: 'SMS受信日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'sms_content',
            label: 'SMSの内容',
            type: 'textarea',
            required: true
          },
          {
            id: 'other_company',
            label: '契約した業者名（SMS記載があれば）',
            type: 'text',
            required: false
          },
          {
            id: 'contract_timing',
            label: '契約時期（SMS記載があれば）',
            type: 'select',
            options: [
              '配信前から契約済み',
              '配信後に契約',
              '不明',
              'その他'
            ],
            required: false
          }
        ]
      },
      {
        id: 'other',
        label: 'その他',
        questions: [
          {
            id: 'detail_hearing',
            label: '詳細をお聞かせください',
            type: 'textarea',
            required: true,
            placeholder: 'お客様からSMSでキャンセルされた詳しい状況を記入してください'
          }
        ]
      }
    ],

    // 5. クレーム
    complaint: [
      {
        id: 'too_many_calls',
        label: '電話・SMSがしつこい',
        questions: [
          {
            id: 'complaint_date',
            label: 'クレーム受付日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'complaint_detail',
            label: 'クレーム内容',
            type: 'textarea',
            required: true,
            placeholder: 'お客様が言っていた具体的な内容を記入してください'
          },
          {
            id: 'actual_contact_count',
            label: '実際の連絡回数（電話）',
            type: 'number',
            required: true
          },
          {
            id: 'actual_sms_count',
            label: '実際の連絡回数（SMS）',
            type: 'number',
            required: true
          },
          {
            id: 'apology_done',
            label: '謝罪対応',
            type: 'select',
            options: [
              '謝罪して了承いただいた',
              '謝罪したが怒っていた',
              '謝罪できなかった（一方的に切られた）',
              'その他'
            ],
            required: true
          }
        ]
      },
      {
        id: 'rude_attitude',
        label: '対応が悪い・失礼',
        questions: [
          {
            id: 'complaint_date',
            label: 'クレーム受付日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'complaint_detail',
            label: 'クレーム内容',
            type: 'textarea',
            required: true,
            placeholder: 'どのような対応が悪かったか、具体的に記入してください'
          },
          {
            id: 'who_complained_about',
            label: '誰の対応か',
            type: 'text',
            required: false,
            placeholder: '担当者名が分かれば'
          },
          {
            id: 'apology_done',
            label: '謝罪対応',
            type: 'select',
            options: [
              '謝罪して了承いただいた',
              '謝罪したが怒っていた',
              '謝罪できなかった（一方的に切られた）',
              'その他'
            ],
            required: true
          }
        ]
      },
      {
        id: 'privacy_concern',
        label: '個人情報の扱いに不安',
        questions: [
          {
            id: 'complaint_date',
            label: 'クレーム受付日時',
            type: 'datetime',
            required: true
          },
          {
            id: 'complaint_detail',
            label: 'クレーム内容',
            type: 'textarea',
            required: true,
            placeholder: 'どのような不安や懸念を言われたか記入してください'
          },
          {
            id: 'explanation_done',
            label: '説明対応',
            type: 'select',
            options: [
              '説明して了承いただいた',
              '説明したが納得されなかった',
              '説明できなかった',
              'その他'
            ],
            required: true
          }
        ]
      },
      {
        id: 'other',
        label: 'その他',
        questions: [
          {
            id: 'detail_hearing',
            label: '詳細をお聞かせください',
            type: 'textarea',
            required: true,
            placeholder: 'クレームの詳しい内容を記入してください'
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
