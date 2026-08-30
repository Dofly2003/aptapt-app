const config = {

 /* MODE APLIKASI */
 TRAINING_MODE: true,

 /* HAPUS DATA TRAINING SETELAH (hari) */
 TRAINING_DELETE_DAYS: 7,

 /* ROUTE YANG WAJIB LOGIN */
 PROTECTED_ROUTES: [
  "/users"
 ],

 /* DISABLE ACTION */
 DISABLED_ACTIONS: {
  deleteUser: true,
  deleteTransaction: true,
  deleteProject: true
 }

};

export default config;