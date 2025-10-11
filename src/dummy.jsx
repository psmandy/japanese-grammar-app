import React from 'react';

function Dummy() {
  return (
    <div className="p-10 font-sans">
      <h1 className="text-3xl font-bold mb-6">Tailwind CSS【自定義顏色】測試頁面</h1>

      <p className="mb-8">
        如果您的 `tailwind.config.js` 設定檔被正確讀取，您應該能看到下方區塊顯示我們**自行定義**的顏色。如果它們都是黑白色，代表您的設定檔依然有問題。
      </p>

      <div className="space-y-4">
        {/* 測試自定義紅色分隔線 */}
        <div className="border-t-4 border-brand-red pt-4">
          <p className="font-bold">自定義紅色分隔線 (border-brand-red)</p>
          <p>如果這條線是 #B91C1C 的深紅色，代表 `tailwind.config.js` 已被正確讀取。</p>
        </div>

        {/* 測試自定義淺紫色按鈕 */}
        <div className="border-t pt-4">
          <p className="font-bold mb-2">自定義淺紫色按鈕 (bg-brand-purple-light)</p>
          <button className="px-5 py-2 text-sm font-bold text-brand-purple-dark bg-brand-purple-light rounded-md">
            淺紫色按鈕
          </button>
          <p className="mt-2">如果這個按鈕是 #DDD6FE 的淺紫色，代表 `tailwind.config.js` 已被正確讀取。</p>
        </div>

      </div>
    </div>
  );
}

export default Dummy;

