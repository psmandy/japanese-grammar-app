// 引入必要的模組
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// --- 設定區 ---
// 讀取您的服務帳戶金鑰
// 請確保 'serviceAccountKey.json' 檔案與此腳本在同一目錄下
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json'));

// 讀取您要匯入的句型資料
// 請確保 'japanese_patterns_seed.json' 檔案與此腳本在同一目錄下
const patternsToImport = JSON.parse(readFileSync('./japanese_patterns_seed.json'));

// 您在 Firestore 中的集合名稱
const collectionName = 'sentencePatterns';
// --- 設定區結束 ---


// 初始化 Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount)
});

// 取得 Firestore 資料庫實例
const db = getFirestore();

// 主要的非同步函式
async function importData() {
  console.log(`🚀 開始匯入 ${patternsToImport.length} 筆資料到 '${collectionName}' 集合...`);

  const collectionRef = db.collection(collectionName);
  let importedCount = 0;
  let failedCount = 0;

  // 使用 Promise.all 來並行處理所有寫入操作，以提高效率
  const promises = patternsToImport.map(async (pattern) => {
    try {
      await collectionRef.add(pattern);
      importedCount++;
      console.log(`[${importedCount}/${patternsToImport.length}] 成功匯入: ${pattern.pattern}`);
    } catch (error) {
      failedCount++;
      console.error(`❌ 匯入失敗: ${pattern.pattern}`, error);
    }
  });

  await Promise.all(promises);

  console.log('\n--- 匯入完成 ---');
  console.log(`✅ 成功: ${importedCount} 筆`);
  if (failedCount > 0) {
    console.log(`❌ 失敗: ${failedCount} 筆`);
  }
  console.log(`🎉 所有 ${patternsToImport.length} 筆 N1 句型資料已成功匯入！`);
}

// 執行函式
importData().catch(console.error);
