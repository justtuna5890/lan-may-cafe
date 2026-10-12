# ============================================================
# LÀN MÂY CAFE
# RESET DATABASE SCRIPT
#
# File: docs/reset_db.ps1
# Cấu hình: .env.example (theo cách triển khai của setup_db.ps1)
#
# Chức năng:
#   1. Đọc và kiểm tra cấu hình DB từ .env.example
#   2. Tự động tìm mysql.exe
#   3. Kiểm tra schema.sql và seed.sql
#   4. Kiểm tra kết nối MySQL
#   5. XÓA database hiện tại và tạo lại
#   6. Chạy schema.sql, seed.sql
#   7. Kiểm tra đủ 9 bảng và thống kê dữ liệu
#
# CẢNH BÁO:
#   Script này XÓA TOÀN BỘ database được cấu hình trong DB_NAME.
#   Không chạy nếu database đang chứa dữ liệu cần giữ lại.
# ============================================================

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

# ============================================================
# 0. ĐƯỜNG DẪN
# ============================================================

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDirectory

$EnvFile = Join-Path $ProjectRoot ".env.example"
$SchemaFile = Join-Path $ProjectRoot "docs\db\schema.sql"
$SeedFile = Join-Path $ProjectRoot "docs\db\seed.sql"

# ============================================================
# HÀM HIỂN THỊ
# ============================================================

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkGray
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# ============================================================
# HÀM ĐỌC .env.example
# ============================================================

function Read-EnvFile {
    param([string]$FilePath)

    $Values = @{}
    $Lines = Get-Content -LiteralPath $FilePath -Encoding UTF8 -ErrorAction Stop

    foreach ($Line in $Lines) {
        $Line = $Line.Trim()

        if ([string]::IsNullOrWhiteSpace($Line) -or $Line.StartsWith("#")) {
            continue
        }

        if ($Line -notmatch "=") {
            continue
        }

        $Parts = $Line -split "=", 2
        if ($Parts.Count -ne 2) {
            continue
        }

        $Key = $Parts[0].Trim()
        $Value = $Parts[1].Trim()

        if (
            $Value.Length -ge 2 -and
            (
                ($Value.StartsWith('"') -and $Value.EndsWith('"')) -or
                ($Value.StartsWith("'") -and $Value.EndsWith("'"))
            )
        ) {
            $Value = $Value.Substring(1, $Value.Length - 2)
        }

        $Values[$Key] = $Value
    }

    return $Values
}

# ============================================================
# [1/7] ĐỌC CẤU HÌNH
# ============================================================

Write-Section "[1/7] DOC CAU HINH TU .env.example"

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-ErrorMessage "Khong tim thay file .env.example"
    Write-Host "Duong dan: $EnvFile" -ForegroundColor Yellow
    exit 1
}

$EnvValues = Read-EnvFile -FilePath $EnvFile
Write-Success "Doc .env.example thanh cong."

$DisplayKeys = @("PORT", "NODE_ENV", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "KDS_TIMEOUT_MS")
Write-Host ""
Write-Host "Cau hinh da doc:" -ForegroundColor White

foreach ($DisplayKey in $DisplayKeys) {
    $DisplayValue = [string]$EnvValues.Item($DisplayKey)

    if ($null -eq $EnvValues.Item($DisplayKey)) {
        Write-Host "  $DisplayKey = [KHONG CO]" -ForegroundColor Yellow
    }
    elseif ($DisplayKey -eq "DB_PASSWORD") {
        Write-Host "  $DisplayKey = ********" -ForegroundColor Gray
    }
    else {
        Write-Host "  $DisplayKey = $DisplayValue" -ForegroundColor Gray
    }
}

# ============================================================
# [2/7] KIỂM TRA DATABASE CONFIG
# ============================================================

Write-Section "[2/7] KIEM TRA DATABASE CONFIG"

$DbHost = [string]$EnvValues.Item("DB_HOST")
$DbPortText = [string]$EnvValues.Item("DB_PORT")
$DbUser = [string]$EnvValues.Item("DB_USER")
$DbPassword = [string]$EnvValues.Item("DB_PASSWORD")
$Database = [string]$EnvValues.Item("DB_NAME")

if ([string]::IsNullOrWhiteSpace($DbHost)) {
    Write-ErrorMessage "DB_HOST khong co gia tri trong .env.example"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($DbPortText)) {
    Write-ErrorMessage "DB_PORT khong co gia tri trong .env.example"
    exit 1
}

$DbPort = 0
if (-not [int]::TryParse($DbPortText, [ref]$DbPort) -or $DbPort -lt 1 -or $DbPort -gt 65535) {
    Write-ErrorMessage "DB_PORT khong phai so hop le: $DbPortText"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($DbUser)) {
    Write-ErrorMessage "DB_USER khong co gia tri trong .env.example"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
    Write-ErrorMessage "DB_PASSWORD khong co gia tri trong .env.example"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Database)) {
    Write-ErrorMessage "DB_NAME khong co gia tri trong .env.example"
    exit 1
}

# Chỉ cho phép tên database dạng identifier đơn giản để tránh lỗi SQL.
if ($Database -notmatch '^[A-Za-z0-9_]+$') {
    Write-ErrorMessage "DB_NAME chi duoc chua chu, so va dau gach duoi."
    exit 1
}

Write-Host ""
Write-Host "Database configuration:" -ForegroundColor White
Write-Host "  Host     : $DbHost"
Write-Host "  Port     : $DbPort"
Write-Host "  User     : $DbUser"
Write-Host "  Password : ********"
Write-Host "  Database : $Database"
Write-Success "Database config hop le."

# ============================================================
# [3/7] TÌM MYSQL.EXE
# ============================================================

Write-Section "[3/7] TIM MYSQL.EXE"
$MysqlExe = $null

try {
    $MysqlCommand = Get-Command mysql.exe -ErrorAction SilentlyContinue
    if ($MysqlCommand) {
        $MysqlExe = $MysqlCommand.Source
    }
}
catch {
    $MysqlExe = $null
}

if (-not $MysqlExe) {
    $PossibleMysqlPaths = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
        "C:\xampp\mysql\bin\mysql.exe"
        "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
        "C:\wamp64\bin\mysql\mysql8.0.36\bin\mysql.exe"
        "C:\wamp64\bin\mysql\mysql8.0.40\bin\mysql.exe"
    )

    foreach ($MysqlPath in $PossibleMysqlPaths) {
        if (Test-Path -LiteralPath $MysqlPath) {
            $MysqlExe = $MysqlPath
            break
        }
    }
}

if (-not $MysqlExe) {
    Write-ErrorMessage "Khong tim thay mysql.exe"
    Write-Host "Hay kiem tra MySQL Server da duoc cai dat." -ForegroundColor Yellow
    Write-Host "Vi du: C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    exit 1
}

Write-Success "Tim thay mysql.exe:"
Write-Host "  $MysqlExe"

# ============================================================
# [4/7] KIỂM TRA FILE DATABASE
# ============================================================

Write-Section "[4/7] KIEM TRA FILE DATABASE"

if (-not (Test-Path -LiteralPath $SchemaFile)) {
    Write-ErrorMessage "Khong tim thay schema.sql"
    Write-Host "Duong dan: $SchemaFile" -ForegroundColor Yellow
    exit 1
}
Write-Success "schema.sql"

if (-not (Test-Path -LiteralPath $SeedFile)) {
    Write-ErrorMessage "Khong tim thay seed.sql"
    Write-Host "Duong dan: $SeedFile" -ForegroundColor Yellow
    exit 1
}
Write-Success "seed.sql"

# ============================================================
# MYSQL_PWD + XỬ LÝ CHÍNH
# ============================================================

$OldMysqlPwd = $env:MYSQL_PWD
$env:MYSQL_PWD = $DbPassword

try {
    # ========================================================
    # [5/7] KIỂM TRA KẾT NỐI MYSQL
    # ========================================================

    Write-Section "[5/7] KIEM TRA KET NOI MYSQL"
    Write-Info "Dang kiem tra dang nhap MySQL..."

    $LoginOutput = & $MysqlExe `
        "--default-character-set=utf8mb4" `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "-N" `
        "-B" `
        "-e" "SELECT 1;" 2>$null

    $LoginExitCode = $LASTEXITCODE
    if ($LoginExitCode -ne 0) {
        Write-ErrorMessage "Khong the dang nhap MySQL. Hay kiem tra DB_HOST, DB_PORT, DB_USER va DB_PASSWORD."
        exit 1
    }

    Write-Success "Dang nhap MySQL thanh cong."

    # Cảnh báo trước khi xóa dữ liệu.
    Write-Host ""
    Write-WarningMessage "CANH BAO: Toan bo database '$Database' se bi XOA va tao lai."
    Write-WarningMessage "Tat ca du lieu hien co trong database nay se mat."
    $ConfirmReset = Read-Host "Nhap RESET de xac nhan tiep tuc"

    if ($ConfirmReset -cne "RESET") {
        Write-Info "Da huy thao tac reset. Database khong bi thay doi."
        exit 0
    }

    # ========================================================
    # [6/7] RESET DATABASE
    # ========================================================

    Write-Section "[6/7] RESET DATABASE"

    Write-Host "Dang xoa database cu: $Database ..." -ForegroundColor Yellow
    $DropSql = "DROP DATABASE IF EXISTS ``$Database``;"
    $null = $DropSql | & $MysqlExe `
        "--default-character-set=utf8mb4" `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Khong the xoa database cu."
        exit 1
    }
    Write-Success "Da xoa database cu."

    Write-Host "Dang tao database moi: $Database ..." -ForegroundColor Yellow
    $CreateSql = "CREATE DATABASE ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    $null = $CreateSql | & $MysqlExe `
        "--default-character-set=utf8mb4" `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Khong the tao database."
        exit 1
    }
    Write-Success "Da tao database: $Database"

    Write-Host ""
    Write-Host "Dang chay schema.sql..." -ForegroundColor Yellow
    $SchemaContent = Get-Content -LiteralPath $SchemaFile -Encoding UTF8 -Raw -ErrorAction Stop
    $null = $SchemaContent | & $MysqlExe `
        "--default-character-set=utf8mb4" `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "$Database" 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Chay schema.sql that bai."
        exit 1
    }
    Write-Success "Chay schema.sql thanh cong."

    Write-Host ""
    Write-Host "Dang chay seed.sql..." -ForegroundColor Yellow
    $SeedContent = Get-Content -LiteralPath $SeedFile -Encoding UTF8 -Raw -ErrorAction Stop
    $null = $SeedContent | & $MysqlExe `
        "--default-character-set=utf8mb4" `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "$Database" 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Chay seed.sql that bai."
        exit 1
    }
    Write-Success "Chay seed.sql thanh cong."

    # ========================================================
    # [7/7] KIỂM TRA DATABASE
    # ========================================================

    Write-Section "[7/7] KIEM TRA DATABASE"

    $ExpectedTables = @(
        "nhan_vien"
        "ban"
        "khach_hang"
        "don_hang"
        "chi_tiet_don"
        "thanh_toan"
        "mon_an"
        "kho_hang"
        "cong_thuc_mon"
    )

    $TableSql = @"
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '$Database'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
"@

    $TableOutput = $TableSql | & $MysqlExe `
        "--default-character-set=utf8mb4" `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "-N" `
        "-B" `
        "$Database" 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Khong the kiem tra danh sach bang."
        exit 1
    }

    $ActualTables = @()
    foreach ($TableLine in $TableOutput) {
        $TableName = "$TableLine".Trim()
        if (-not [string]::IsNullOrWhiteSpace($TableName)) {
            $ActualTables += $TableName
        }
    }

    Write-Host ""
    Write-Host "Cac bang hien co:" -ForegroundColor White
    foreach ($TableName in $ActualTables) {
        Write-Host "  - $TableName" -ForegroundColor Gray
    }

    if ($ActualTables.Count -ne 9) {
        Write-ErrorMessage "Database phai co dung 9 bang; hien tai co $($ActualTables.Count) bang."
        exit 1
    }

    $MissingTables = @()
    foreach ($ExpectedTable in $ExpectedTables) {
        if ($ActualTables -notcontains $ExpectedTable) {
            $MissingTables += $ExpectedTable
        }
    }

    if ($MissingTables.Count -gt 0) {
        Write-ErrorMessage "Thieu bang trong database:"
        foreach ($MissingTable in $MissingTables) {
            Write-Host "  - $MissingTable" -ForegroundColor Red
        }
        exit 1
    }

    Write-Success "Da tim thay day du 9 bang."

    Write-Host ""
    Write-Info "Dang kiem tra du lieu seed..."

    foreach ($ExpectedTable in $ExpectedTables) {
        $CountSql = "SELECT COUNT(*) FROM ``$ExpectedTable``;"
        $CountOutput = $CountSql | & $MysqlExe `
            "--default-character-set=utf8mb4" `
            "-h" $DbHost `
            "-P" "$DbPort" `
            "-u" $DbUser `
            "-N" `
            "-B" `
            "$Database" 2>$null

        if ($LASTEXITCODE -ne 0) {
            Write-WarningMessage "Khong doc duoc so luong bang $ExpectedTable"
            continue
        }

        $CountValue = "$CountOutput".Trim()
        Write-Host ("  {0,-20} : {1} rows" -f $ExpectedTable, $CountValue)
    }

    $HealthSql = @"
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_schema = '$Database'
  AND table_type = 'BASE TABLE';
"@

    $HealthOutput = $HealthSql | & $MysqlExe `
        "--default-character-set=utf8mb4" `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "-N" `
        "-B" 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Database khong phan hoi dung."
        exit 1
    }

    $TableCount = "$HealthOutput".Trim()
    if ([int]$TableCount -ne 9) {
        Write-ErrorMessage "Database chi co $TableCount bang."
        exit 1
    }

    Write-Success "Database $Database dang hoat dong."
}
finally {
    if ($null -eq $OldMysqlPwd) {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    }
    else {
        $env:MYSQL_PWD = $OldMysqlPwd
    }
}

# ============================================================
# HOÀN TẤT
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "              RESET DATABASE THANH CONG" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database : $Database"
Write-Host "Host     : $DbHost"
Write-Host "Port     : $DbPort"
Write-Host "Tables   : 9"
Write-Host ""
Write-Host "Hoan tat." -ForegroundColor Green
Write-Host ""
