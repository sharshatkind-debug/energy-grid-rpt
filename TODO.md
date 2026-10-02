# TODO - Energy Grid RPT Demo

> **🌐 Repository**: https://github.com/sharshatkind-debug/energy-grid-rpt  
> **📝 Purpose**: Public demo for customer presentations and educational content

## Completed ✅

- [x] CAP project scaffolding
- [x] Data model (GridSnapshots, PowerPlants, WeatherForecast, PredictionRequests)
- [x] Service definition with OData endpoints
- [x] Service implementation with SAP RPT integration
- [x] Sample data (15 historical grid snapshots, 5 power plants)
- [x] Custom Control Center UI with:
  - [x] Grid status dashboard
  - [x] Power plants list
  - [x] Weather forecast sliders
  - [x] Preset scenarios (Sunny, Cloudy, Storm, Crisis)
  - [x] RPT prediction button
- [x] Fiori Elements annotations
- [x] Local development setup
- [x] Cloud Foundry manifest
- [x] Documentation (README.md)
- [x] CF CLI login configured

## Pending ⏳

### Before Testing RPT Integration

- [ ] **Get SAP AI Core Service Key from admin**
  - Contact admin to create service key with name: `dimas-rpt-demo`
  - Or request permission to create service keys yourself

- [ ] **Configure credentials locally**
  ```bash
  cd C:\Users\I040034\projects\energy-grid-rpt
  cp .env.example .env
  # Edit .env with service key values
  ```

### GitHub Setup

- [ ] **Create GitHub repository**
  - Go to github.com and create: `energy-grid-rpt`
  - Initialize as empty (no README)

- [ ] **Push code to GitHub**
  ```bash
  cd C:\Users\I040034\projects\energy-grid-rpt
  git init
  git add .
  git commit -m "Initial commit: Energy Grid RPT Demo"
  git branch -M main
  git remote add origin https://github.com/YOUR_USERNAME/energy-grid-rpt.git
  git push -u origin main
  ```

- [ ] **Update package.json** with actual repository URL

### Cloud Foundry Deployment

- [ ] **Deploy to Cloud Foundry**
  ```bash
  cf push
  ```

- [ ] **Configure environment variables in CF**
  ```bash
  cf set-env energy-grid-rpt AI_CORE_CLIENT_ID "..."
  cf set-env energy-grid-rpt AI_CORE_CLIENT_SECRET "..."
  cf set-env energy-grid-rpt AI_CORE_TOKEN_URL "..."
  cf set-env energy-grid-rpt AI_CORE_API_URL "..."
  cf set-env energy-grid-rpt RPT_DEPLOYMENT_URL "..."
  cf restage energy-grid-rpt
  ```

- [ ] **Test deployed application**

### RPT Integration Testing

- [ ] **Test locally with credentials**
  ```bash
  npm run dev
  # Open http://localhost:4004/control-center/control-center.html
  # Try prediction with different scenarios
  ```

- [ ] **Verify RPT payload format** matches RPT 1.6 API spec
- [ ] **Adjust response parsing** if needed based on actual RPT response

### Optional Enhancements

- [ ] Add more historical data for better RPT context
- [ ] Add user authentication (XSUAA)
- [ ] Add destination service for AI Core credentials
- [ ] Add logging/monitoring
- [ ] Create presentation slides from documentation

## Quick Commands Reference

```bash
# Local development
cd C:\Users\I040034\projects\energy-grid-rpt
npm run dev
# Open: http://localhost:4004/control-center/control-center.html

# Cloud Foundry
cf login -a https://api.cf.eu10.hana.ondemand.com --sso
cf target -o "CoE EMEA_ai-bb-dev-ext-aws" -s "ai-core-ext"
cf push
cf logs energy-grid-rpt --recent

# Git
git status
git add .
git commit -m "message"
git push
```

## Files Location

| Item | Path |
|------|------|
| CAP Project | `C:\Users\I040034\projects\energy-grid-rpt` |
| Presentation Guide | `C:\Users\I040034\.claude\projects\rpt_session\SAP_RPT_Presentation_Guide.md` |
| Control Center UI | `app/control-center.html` |
| Service Implementation | `srv/grid-service.js` |
| Data Model | `db/schema.cds` |
