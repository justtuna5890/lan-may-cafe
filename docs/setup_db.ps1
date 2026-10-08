# ============================================================
# LÀN MÂY CAFE
# SETUP DATABASE SCRIPT
#
# File:
#   docs/setup_db.ps1
#
# Nguồn cấu hình:
#   .env.example
#
# Chức năng:
#   1. Đọc DB config từ .env.example
#   2. Tự động tìm mysql.exe
#   3. Kiểm tra schema.sql
#   4. Kiểm tra seed.sql
#   5. Kiểm tra kết nối MySQL
#   6. Kiểm tra database đã tồn tại chưa
#   7. Nếu chưa có:
#        - CREATE DATABASE
#        - schema.sql
#        - seed.sql
#   8. Nếu đã có:
#        - KHÔNG XÓA
#        - KHÔNG chạy lại schema.sql
#        - KHÔNG chạy lại seed.sql
#        - Giữ nguyên dữ liệu
#   9. Kiểm tra đủ 9 bảng
#  10. Kiểm tra số lượng dữ liệu
#
# Không hard-code DB config.
# ============================================================

$ErrorActionPreference = "Stop"


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
    param (
        [string]$Title
    )

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkGray
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkGray
}

function Write-Success {
    param (
        [string]$Message
    )

    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Info {
    param (
        [string]$Message
    )

    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarningMessage {
    param (
        [string]$Message
    )

    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param (
        [string]$Message
    )

    Write-Host "[ERROR] $Message" -ForegroundColor Red
}


# ============================================================
# HÀM ĐỌC .env.example
# ============================================================

function Read-EnvFile {
    param (
        [string]$FilePath
    )

    $Values = @{}

    $Lines = Get-Content `
        -LiteralPath $FilePath `
        -ErrorAction Stop

    foreach ($Line in $Lines) {

        # Bỏ khoảng trắng đầu/cuối
        $Line = $Line.Trim()

        # Bỏ dòng trống
        if ([string]::IsNullOrWhiteSpace($Line)) {
            continue
        }

        # Bỏ comment
        if ($Line.StartsWith("#")) {
            continue
        }

        # Chỉ xử lý dòng có dấu =
        if ($Line -notmatch "=") {
            continue
        }

        # Chỉ split tại dấu = đầu tiên
        $Parts = $Line -split "=", 2

        if ($Parts.Count -ne 2) {
            continue
        }

        $Key = $Parts[0].Trim()
        $Value = $Parts[1].Trim()

        # Bỏ quote nếu có
        if (
            $Value.Length -ge 2 -and
            (
                (
                    $Value.StartsWith('"') -and
                    $Value.EndsWith('"')
                ) -or
                (
                    $Value.StartsWith("'") -and
                    $Value.EndsWith("'")
                )
            )
        ) {
            $Value = $Value.Substring(1, $Value.Length - 2)
        }

        $Values[$Key] = $Value
    }

    return $Values
}


# ============================================================
# [1/7] ĐỌC .env.example
# ============================================================

Write-Section "[1/7] DOC CAU HINH TU .env.example"

if (-not (Test-Path -LiteralPath $EnvFile)) {

    Write-ErrorMessage "Khong tim thay file .env.example"

    Write-Host ""
    Write-Host "Duong dan:"
    Write-Host "  $EnvFile"

    exit 1
}

Write-Info "Dang doc .env.example..."

$EnvValues = Read-EnvFile -FilePath $EnvFile

Write-Success "Doc .env.example thanh cong."


# ============================================================
# HIỂN THỊ CẤU HÌNH ĐÃ ĐỌC
# ============================================================

Write-Host ""
Write-Host "Cau hinh da doc:" -ForegroundColor White

$DisplayKeys = @(
    "PORT",
    "NODE_ENV",
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "KDS_TIMEOUT_MS"
)

foreach ($DisplayKey in $DisplayKeys) {

    $DisplayValue = $EnvValues.Item($DisplayKey)

    if ($null -eq $DisplayValue) {

        Write-Host `
            "  $DisplayKey = [KHONG CO]" `
            -ForegroundColor Yellow
    }
    elseif ($DisplayKey -eq "DB_PASSWORD") {

        Write-Host `
            "  $DisplayKey = ********" `
            -ForegroundColor Gray
    }
    else {

        Write-Host `
            "  $DisplayKey = $DisplayValue" `
            -ForegroundColor Gray
    }
}


# ============================================================
# [2/7] KIỂM TRA DATABASE CONFIG
# ============================================================

Write-Section "[2/7] KIEM TRA DATABASE CONFIG"


# ------------------------------------------------------------
# QUAN TRỌNG:
#
# Dùng .Item("KEY") thay vì:
#
# [string]$EnvValues["KEY"]
#
# để tránh PowerShell parse sai biểu thức.
# ------------------------------------------------------------

$DbHost = [string]$EnvValues.Item("DB_HOST")
$DbPortText = [string]$EnvValues.Item("DB_PORT")
$DbUser = [string]$EnvValues.Item("DB_USER")
$DbPassword = [string]$EnvValues.Item("DB_PASSWORD")
$Database = [string]$EnvValues.Item("DB_NAME")


# ============================================================
# KIỂM TRA DB_HOST
# ============================================================

if ([string]::IsNullOrWhiteSpace($DbHost)) {

    Write-ErrorMessage `
        "DB_HOST khong co gia tri trong .env.example"

    exit 1
}


# ============================================================
# KIỂM TRA DB_PORT
# ============================================================

if ([string]::IsNullOrWhiteSpace($DbPortText)) {

    Write-ErrorMessage `
        "DB_PORT khong co gia tri trong .env.example"

    exit 1
}

$DbPort = 0

if (-not [int]::TryParse($DbPortText, [ref]$DbPort)) {

    Write-ErrorMessage `
        "DB_PORT khong phai so hop le: $DbPortText"

    exit 1
}


# ============================================================
# KIỂM TRA DB_USER
# ============================================================

if ([string]::IsNullOrWhiteSpace($DbUser)) {

    Write-ErrorMessage `
        "DB_USER khong co gia tri trong .env.example"

    exit 1
}


# ============================================================
# KIỂM TRA DB_PASSWORD
# ============================================================

if ([string]::IsNullOrWhiteSpace($DbPassword)) {

    Write-ErrorMessage `
        "DB_PASSWORD khong co gia tri trong .env.example"

    exit 1
}


# ============================================================
# KIỂM TRA DB_NAME
# ============================================================

if ([string]::IsNullOrWhiteSpace($Database)) {

    Write-ErrorMessage `
        "DB_NAME khong co gia tri trong .env.example"

    exit 1
}


# ============================================================
# HIỂN THỊ CONFIG
# ============================================================

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


# ------------------------------------------------------------
# Tìm mysql.exe trong PATH
# ------------------------------------------------------------

try {

    $MysqlCommand = Get-Command `
        mysql.exe `
        -ErrorAction SilentlyContinue

    if ($MysqlCommand) {

        $MysqlExe = $MysqlCommand.Source
    }
}
catch {

    $MysqlExe = $null
}


# ------------------------------------------------------------
# Nếu PATH không có thì tìm đường dẫn phổ biến
# ------------------------------------------------------------

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


# ------------------------------------------------------------
# Không tìm thấy
# ------------------------------------------------------------

if (-not $MysqlExe) {

    Write-ErrorMessage `
        "Khong tim thay mysql.exe"

    Write-Host ""
    Write-Host `
        "Hay kiem tra MySQL Server da duoc cai dat." `
        -ForegroundColor Yellow

    Write-Host ""
    Write-Host "Vi du:"
    Write-Host `
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

    exit 1
}


Write-Success "Tim thay mysql.exe:"
Write-Host "  $MysqlExe"


# ============================================================
# [4/7] KIỂM TRA FILE DATABASE
# ============================================================

Write-Section "[4/7] KIEM TRA FILE DATABASE"


if (-not (Test-Path -LiteralPath $SchemaFile)) {

    Write-ErrorMessage `
        "Khong tim thay schema.sql"

    Write-Host ""
    Write-Host "Duong dan:"
    Write-Host "  $SchemaFile"

    exit 1
}

Write-Success "schema.sql"


if (-not (Test-Path -LiteralPath $SeedFile)) {

    Write-ErrorMessage `
        "Khong tim thay seed.sql"

    Write-Host ""
    Write-Host "Duong dan:"
    Write-Host "  $SeedFile"

    exit 1
}

Write-Success "seed.sql"


# ============================================================
# THIẾT LẬP MYSQL_PWD
# ============================================================

$OldMysqlPwd = $env:MYSQL_PWD

$env:MYSQL_PWD = $DbPassword


try {

    # ========================================================
    # [5/7] KIỂM TRA KẾT NỐI MYSQL
    # ========================================================

    Write-Section "[5/7] KIEM TRA KET NOI MYSQL"

    Write-Host `
        "Dang kiem tra dang nhap MySQL..." `
        -ForegroundColor Cyan


    $LoginOutput = & $MysqlExe `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "-e" "SELECT 1;" `
        2>$null


    $LoginExitCode = $LASTEXITCODE


    if ($LoginExitCode -ne 0) {

        Write-ErrorMessage `
            "Khong the dang nhap MySQL."

        Write-Host ""
        Write-Host "Thong tin ket noi:" `
            -ForegroundColor Yellow

        Write-Host "  Host : $DbHost"
        Write-Host "  Port : $DbPort"
        Write-Host "  User : $DbUser"

        exit 1
    }


    Write-Success `
        "Dang nhap MySQL thanh cong."


    # ========================================================
    # [6/7] SETUP DATABASE
    # ========================================================

    Write-Section "[6/7] SETUP DATABASE"

    Write-Host `
        "Dang kiem tra database: $Database ..." `
        -ForegroundColor Cyan


    # --------------------------------------------------------
    # Kiểm tra database tồn tại
    # --------------------------------------------------------

    $CheckDatabaseSql = @"
SELECT SCHEMA_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME = '$Database';
"@


    $DatabaseOutput = $CheckDatabaseSql |
    & $MysqlExe `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "-N" `
        "-B" `
        2>$null


    $DatabaseExitCode = $LASTEXITCODE


    if ($DatabaseExitCode -ne 0) {

        Write-ErrorMessage `
            "Khong the kiem tra database."

        exit 1
    }


    # --------------------------------------------------------
    # Xác định database tồn tại
    # --------------------------------------------------------

    $DatabaseExists = $false


    foreach ($DatabaseLine in $DatabaseOutput) {

        if ("$DatabaseLine".Trim() -eq $Database) {

            $DatabaseExists = $true

            break
        }
    }


    # ========================================================
    # DATABASE CHƯA TỒN TẠI
    # ========================================================

    if (-not $DatabaseExists) {

        Write-Host ""

        Write-Host `
            "Database chua ton tai." `
            -ForegroundColor Yellow

        Write-Host `
            "Dang tao database moi: $Database ..." `
            -ForegroundColor Yellow


        # ----------------------------------------------------
        # CREATE DATABASE
        # ----------------------------------------------------

        $CreateSql = `
            "CREATE DATABASE ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"


        $CreateOutput = $CreateSql |
        & $MysqlExe `
            "-h" $DbHost `
            "-P" "$DbPort" `
            "-u" $DbUser `
            2>$null


        $CreateExitCode = $LASTEXITCODE


        if ($CreateExitCode -ne 0) {

            Write-ErrorMessage `
                "Khong the tao database."

            exit 1
        }


        Write-Success `
            "Da tao database: $Database"


        # ----------------------------------------------------
        # CHẠY SCHEMA
        # ----------------------------------------------------

        Write-Host ""

        Write-Host `
            "Dang chay schema.sql..." `
            -ForegroundColor Yellow


        $SchemaContent = Get-Content `
            -LiteralPath $SchemaFile `
            -Raw `
            -ErrorAction Stop


        $SchemaOutput = $SchemaContent |
        & $MysqlExe `
            "-h" $DbHost `
            "-P" "$DbPort" `
            "-u" $DbUser `
            "$Database" `
            2>$null


        $SchemaExitCode = $LASTEXITCODE


        if ($SchemaExitCode -ne 0) {

            Write-ErrorMessage `
                "Chay schema.sql that bai."

            exit 1
        }


        Write-Success `
            "Chay schema.sql thanh cong."


        # ----------------------------------------------------
        # CHẠY SEED
        # ----------------------------------------------------

        Write-Host ""

        Write-Host `
            "Dang chay seed.sql..." `
            -ForegroundColor Yellow


        $SeedContent = Get-Content `
            -LiteralPath $SeedFile `
            -Raw `
            -ErrorAction Stop


        $SeedOutput = $SeedContent |
        & $MysqlExe `
            "-h" $DbHost `
            "-P" "$DbPort" `
            "-u" $DbUser `
            "$Database" `
            2>$null


        $SeedExitCode = $LASTEXITCODE


        if ($SeedExitCode -ne 0) {

            Write-ErrorMessage `
                "Chay seed.sql that bai."

            exit 1
        }


        Write-Success `
            "Chay seed.sql thanh cong."
    }


    # ========================================================
    # DATABASE ĐÃ TỒN TẠI
    # ========================================================

    else {

        Write-Host ""

        Write-WarningMessage `
            "Database $Database da ton tai."

        Write-Host `
            "[INFO] Khong xoa database hien tai."

        Write-Host `
            "[INFO] Khong chay lai schema.sql."

        Write-Host `
            "[INFO] Khong chay lai seed.sql."

        Write-Host `
            "[INFO] Du lieu hien tai duoc giu nguyen."
    }


    # ========================================================
    # [7/7] KIỂM TRA DATABASE
    # ========================================================

    Write-Section "[7/7] KIEM TRA DATABASE"


    # --------------------------------------------------------
    # 9 bảng bắt buộc
    # --------------------------------------------------------

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


    # --------------------------------------------------------
    # Lấy danh sách bảng
    # --------------------------------------------------------

    Write-Host ""

    Write-Host `
        "Dang kiem tra 9 bang..." `
        -ForegroundColor Cyan


    $TableSql = @"
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '$Database'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
"@


    $TableOutput = $TableSql |
    & $MysqlExe `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "-N" `
        "-B" `
        "$Database" `
        2>$null


    $TableExitCode = $LASTEXITCODE


    if ($TableExitCode -ne 0) {

        Write-ErrorMessage `
            "Khong the kiem tra danh sach bang."

        exit 1
    }


    $ActualTables = @()


    foreach ($TableLine in $TableOutput) {

        $TableName = "$TableLine".Trim()

        if (-not [string]::IsNullOrWhiteSpace($TableName)) {

            $ActualTables += $TableName
        }
    }


    # --------------------------------------------------------
    # Hiển thị danh sách bảng
    # --------------------------------------------------------

    Write-Host ""

    Write-Host `
        "Cac bang hien co:" `
        -ForegroundColor White


    foreach ($TableName in $ActualTables) {

        Write-Host `
            "  - $TableName" `
            -ForegroundColor Gray
    }


    # --------------------------------------------------------
    # Kiểm tra đúng 9 bảng
    # --------------------------------------------------------

    if ($ActualTables.Count -ne 9) {

        Write-ErrorMessage `
            "Database phai co 9 bang."

        Write-Host ""

        Write-Host `
            "Hien tai: $($ActualTables.Count) bang." `
            -ForegroundColor Yellow

        exit 1
    }


    # --------------------------------------------------------
    # Kiểm tra thiếu bảng
    # --------------------------------------------------------

    $MissingTables = @()


    foreach ($ExpectedTable in $ExpectedTables) {

        if ($ActualTables -notcontains $ExpectedTable) {

            $MissingTables += $ExpectedTable
        }
    }


    if ($MissingTables.Count -gt 0) {

        Write-ErrorMessage `
            "Thieu bang trong database:"


        foreach ($MissingTable in $MissingTables) {

            Write-Host `
                "  - $MissingTable" `
                -ForegroundColor Red
        }

        exit 1
    }


    Write-Success `
        "Da tim thay day du 9 bang."


    # ========================================================
    # KIỂM TRA SỐ LƯỢNG ROW
    # ========================================================

    Write-Host ""

    Write-Host `
        "Dang kiem tra du lieu..." `
        -ForegroundColor Cyan


    foreach ($ExpectedTable in $ExpectedTables) {

        $CountSql = `
            "SELECT COUNT(*) FROM ``$ExpectedTable``;"


        $CountOutput = $CountSql |
        & $MysqlExe `
            "-h" $DbHost `
            "-P" "$DbPort" `
            "-u" $DbUser `
            "-N" `
            "-B" `
            "$Database" `
            2>$null


        $CountExitCode = $LASTEXITCODE


        if ($CountExitCode -ne 0) {

            Write-WarningMessage `
                "Khong doc duoc so luong bang $ExpectedTable"

            continue
        }


        $CountValue = "$CountOutput".Trim()


        Write-Host (
            "  {0,-20} : {1} rows" -f
            $ExpectedTable,
            $CountValue
        )
    }


    # ========================================================
    # HEALTH CHECK
    # ========================================================

    Write-Host ""

    Write-Host `
        "Dang kiem tra database $Database..." `
        -ForegroundColor Cyan


    $HealthSql = @"
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_schema = '$Database'
  AND table_type = 'BASE TABLE';
"@


    $HealthOutput = $HealthSql |
    & $MysqlExe `
        "-h" $DbHost `
        "-P" "$DbPort" `
        "-u" $DbUser `
        "-N" `
        "-B" `
        2>$null


    $HealthExitCode = $LASTEXITCODE


    if ($HealthExitCode -ne 0) {

        Write-ErrorMessage `
            "Database khong phan hoi dung."

        exit 1
    }


    $TableCount = "$HealthOutput".Trim()


    if ([int]$TableCount -ne 9) {

        Write-ErrorMessage `
            "Database chi co $TableCount bang."

        exit 1
    }


    Write-Success `
        "Database $Database dang hoat dong."
}


# ============================================================
# KHÔI PHỤC MYSQL_PWD
# ============================================================

finally {

    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }
}


# ============================================================
# HOÀN TẤT
# ============================================================

Write-Host ""

Write-Host `
    "============================================================" `
    -ForegroundColor Green

Write-Host `
    "             SETUP DATABASE THANH CONG" `
    -ForegroundColor Green

Write-Host `
    "============================================================" `
    -ForegroundColor Green

Write-Host ""

Write-Host "Database : $Database"
Write-Host "Host     : $DbHost"
Write-Host "Port     : $DbPort"
Write-Host "Tables   : 9"

Write-Host ""

Write-Host `
    "Hoan tat." `
    -ForegroundColor Green

Write-Host ""