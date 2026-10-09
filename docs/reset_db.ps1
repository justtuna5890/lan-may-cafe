# ============================================================
# LÀN MÂY CAFE
# RESET DATABASE SCRIPT
#
# File:
#   docs/reset_db.ps1
#
# Database config:
#   .env.example
#   src/config/index.js
#
# Chức năng:
#   1. Đọc DB config từ .env.example
#   2. Tự động tìm mysql.exe
#   3. Kiểm tra schema.sql
#   4. Kiểm tra seed.sql
#   5. Kiểm tra kết nối MySQL
#   6. Xóa database cũ
#   7. Tạo database mới
#   8. Chạy schema.sql
#   9. Chạy seed.sql
#  10. Kiểm tra đủ 9 bảng
#  11. Kiểm tra dữ liệu seed
#
# Lưu ý:
#   - Không hỏi password
#   - Password lấy từ .env.example
#   - Sử dụng MYSQL_PWD
#   - RESET sẽ XÓA TOÀN BỘ database hiện tại
# ============================================================


# ============================================================
# 0. CẤU HÌNH POWERSHELL
# ============================================================

$ErrorActionPreference = "Stop"


# ============================================================
# 1. XÁC ĐỊNH ĐƯỜNG DẪN PROJECT
# ============================================================

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path

$ProjectRoot = Split-Path -Parent $ScriptDirectory


# ============================================================
# 2. ĐƯỜNG DẪN FILE
# ============================================================

$EnvFile = Join-Path $ProjectRoot ".env.example"

$SchemaFile = Join-Path $ProjectRoot "docs\db\schema.sql"

$SeedFile = Join-Path $ProjectRoot "docs\db\seed.sql"


# ============================================================
# 3. HÀM HIỂN THỊ
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
# 4. HÀM ĐỌC .env.example
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

        # ----------------------------------------------------
        # Xóa khoảng trắng đầu/cuối
        # ----------------------------------------------------

        $Line = $Line.Trim()


        # ----------------------------------------------------
        # Bỏ dòng rỗng
        # ----------------------------------------------------

        if ([string]::IsNullOrWhiteSpace($Line)) {
            continue
        }


        # ----------------------------------------------------
        # Bỏ comment
        # ----------------------------------------------------

        if ($Line.StartsWith("#")) {
            continue
        }


        # ----------------------------------------------------
        # Phải có dấu =
        # ----------------------------------------------------

        if ($Line -notmatch "=") {
            continue
        }


        # ----------------------------------------------------
        # Tách KEY=VALUE
        # Chỉ tách dấu = đầu tiên
        # ----------------------------------------------------

        $Parts = $Line -split "=", 2


        if ($Parts.Count -ne 2) {
            continue
        }


        $Key = $Parts[0].Trim()

        $Value = $Parts[1].Trim()


        # ----------------------------------------------------
        # Bỏ quote nếu có
        # ----------------------------------------------------

        if (
            $Value.Length -ge 2 -and
            (
                ($Value.StartsWith('"') -and $Value.EndsWith('"')) -or
                ($Value.StartsWith("'") -and $Value.EndsWith("'"))
            )
        ) {

            $Value = $Value.Substring(
                1,
                $Value.Length - 2
            )
        }


        # ----------------------------------------------------
        # Lưu vào Hashtable
        # ----------------------------------------------------

        $Values[$Key] = $Value
    }


    return $Values
}


# ============================================================
# 5. [1/7] ĐỌC .env.example
# ============================================================

Write-Section "[1/7] DOC CAU HINH TU .env.example"


if (-not (Test-Path -LiteralPath $EnvFile)) {

    Write-ErrorMessage "Khong tim thay file .env.example"

    Write-Host ""
    Write-Host "Duong dan:" -ForegroundColor Yellow
    Write-Host "  $EnvFile"

    exit 1
}


Write-Info "Dang doc .env.example..."


$EnvValues = Read-EnvFile -FilePath $EnvFile


Write-Success "Doc .env.example thanh cong."


# ============================================================
# 6. [2/7] ĐỌC DATABASE CONFIG
# ============================================================

Write-Section "[2/7] DOC DATABASE CONFIG"


# ------------------------------------------------------------
# Lấy trực tiếp bằng Get_Item()
#
# Đồng bộ với setup_db.ps1.
# Không sử dụng:
#
#   $EnvValues["DB_PASSWORD"]
#
# ------------------------------------------------------------

$DbHost = [string]$EnvValues.Get_Item("DB_HOST")

$DbPortText = [string]$EnvValues.Get_Item("DB_PORT")

$DbUser = [string]$EnvValues.Get_Item("DB_USER")

$DbPassword = [string]$EnvValues.Get_Item("DB_PASSWORD")

$Database = [string]$EnvValues.Get_Item("DB_NAME")


# ============================================================
# KIỂM TRA CONFIG
# ============================================================

if ([string]::IsNullOrWhiteSpace($DbHost)) {

    Write-ErrorMessage "DB_HOST khong co gia tri trong .env.example"

    exit 1
}


if ([string]::IsNullOrWhiteSpace($DbPortText)) {

    Write-ErrorMessage "DB_PORT khong co gia tri trong .env.example"

    exit 1
}


$DbPort = 0


if (-not [int]::TryParse(
        $DbPortText,
        [ref]$DbPort
    )) {

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


# ============================================================
# 7. [3/7] TÌM MYSQL.EXE
# ============================================================

Write-Section "[3/7] TIM MYSQL.EXE"


$MysqlExe = $null


# ------------------------------------------------------------
# Cách 1: mysql.exe có trong PATH
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
# Cách 2: tìm các đường dẫn phổ biến
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


    foreach ($Path in $PossibleMysqlPaths) {

        if (Test-Path -LiteralPath $Path) {

            $MysqlExe = $Path

            break
        }
    }
}


# ------------------------------------------------------------
# Không tìm thấy
# ------------------------------------------------------------

if (-not $MysqlExe) {

    Write-ErrorMessage "Khong tim thay mysql.exe"

    Write-Host ""

    Write-Host "Hay kiem tra MySQL Server da duoc cai dat." `
        -ForegroundColor Yellow

    Write-Host ""

    Write-Host "Vi du:" -ForegroundColor Yellow

    Write-Host `
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

    exit 1
}


Write-Success "Tim thay mysql.exe:"

Write-Host "  $MysqlExe"


# ============================================================
# 8. [4/7] KIỂM TRA FILE DATABASE
# ============================================================

Write-Section "[4/7] KIEM TRA FILE DATABASE"


# ------------------------------------------------------------
# schema.sql
# ------------------------------------------------------------

if (-not (Test-Path -LiteralPath $SchemaFile)) {

    Write-ErrorMessage "Khong tim thay schema.sql"

    Write-Host ""

    Write-Host "Duong dan:" -ForegroundColor Yellow

    Write-Host "  $SchemaFile"

    exit 1
}


Write-Success "schema.sql"


# ------------------------------------------------------------
# seed.sql
# ------------------------------------------------------------

if (-not (Test-Path -LiteralPath $SeedFile)) {

    Write-ErrorMessage "Khong tim thay seed.sql"

    Write-Host ""

    Write-Host "Duong dan:" -ForegroundColor Yellow

    Write-Host "  $SeedFile"

    exit 1
}


Write-Success "seed.sql"


# ============================================================
# 9. LƯU MYSQL_PWD
# ============================================================

$OldMysqlPwd = $env:MYSQL_PWD


# ------------------------------------------------------------
# Đặt password lấy từ .env.example
# ------------------------------------------------------------

$env:MYSQL_PWD = $DbPassword


# ============================================================
# 10. [5/7] KIỂM TRA ĐĂNG NHẬP MYSQL
# ============================================================

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

    Write-ErrorMessage "Khong the dang nhap MySQL."

    Write-Host ""

    Write-Host "Thong tin ket noi:" -ForegroundColor Yellow

    Write-Host "  Host     : $DbHost"

    Write-Host "  Port     : $DbPort"

    Write-Host "  User     : $DbUser"

    Write-Host "  Database : $Database"


    # --------------------------------------------------------
    # Khôi phục MYSQL_PWD
    # --------------------------------------------------------

    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


Write-Success "Dang nhap MySQL thanh cong."


# ============================================================
# 11. [6/7] RESET DATABASE
# ============================================================

Write-Section "[6/7] RESET DATABASE"


# ============================================================
# 11.1 XÓA DATABASE CŨ
# ============================================================

Write-Host ""

Write-Host `
    "Dang xoa database cu: $Database ..." `
    -ForegroundColor Yellow


# ------------------------------------------------------------
# Kết quả SQL:
#
# DROP DATABASE IF EXISTS `lan_may_cafe`;
#
# Hai backtick `` trong PowerShell tạo một dấu `
# ------------------------------------------------------------

$DropSql = "DROP DATABASE IF EXISTS ``$Database``;"


$DropOutput = $DropSql | & $MysqlExe `
    "-h" $DbHost `
    "-P" "$DbPort" `
    "-u" $DbUser `
    2>$null


$DropExitCode = $LASTEXITCODE


if ($DropExitCode -ne 0) {

    Write-ErrorMessage "Khong the xoa database cu."


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


Write-Success "Da xoa database cu."


# ============================================================
# 11.2 TẠO DATABASE MỚI
# ============================================================

Write-Host ""

Write-Host `
    "Dang tao database moi: $Database ..." `
    -ForegroundColor Yellow


$CreateSql = `
    "CREATE DATABASE ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"


$CreateOutput = $CreateSql | & $MysqlExe `
    "-h" $DbHost `
    "-P" "$DbPort" `
    "-u" $DbUser `
    2>$null


$CreateExitCode = $LASTEXITCODE


if ($CreateExitCode -ne 0) {

    Write-ErrorMessage "Khong the tao database."


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


Write-Success "Da tao database: $Database"


# ============================================================
# 11.3 CHẠY SCHEMA.SQL
# ============================================================

Write-Host ""

Write-Host `
    "Dang chay schema.sql..." `
    -ForegroundColor Yellow


$SchemaContent = Get-Content `
    -LiteralPath $SchemaFile `
    -Raw `
    -ErrorAction Stop


$SchemaOutput = $SchemaContent | & $MysqlExe `
    "-h" $DbHost `
    "-P" "$DbPort" `
    "-u" $DbUser `
    "$Database" `
    2>$null


$SchemaExitCode = $LASTEXITCODE


if ($SchemaExitCode -ne 0) {

    Write-ErrorMessage "Chay schema.sql that bai."


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


Write-Success "Chay schema.sql thanh cong."


# ============================================================
# 11.4 CHẠY SEED.SQL
# ============================================================

Write-Host ""

Write-Host `
    "Dang chay seed.sql..." `
    -ForegroundColor Yellow


$SeedContent = Get-Content `
    -LiteralPath $SeedFile `
    -Raw `
    -ErrorAction Stop


$SeedOutput = $SeedContent | & $MysqlExe `
    "-h" $DbHost `
    "-P" "$DbPort" `
    "-u" $DbUser `
    "$Database" `
    2>$null


$SeedExitCode = $LASTEXITCODE


if ($SeedExitCode -ne 0) {

    Write-ErrorMessage "Chay seed.sql that bai."


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


Write-Success "Chay seed.sql thanh cong."


# ============================================================
# 12. [7/7] KIỂM TRA DATABASE
# ============================================================

Write-Section "[7/7] KIEM TRA DATABASE"


# ============================================================
# 12.1 DANH SÁCH 9 BẢNG BẮT BUỘC
# ============================================================

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


# ============================================================
# 12.2 LẤY DANH SÁCH TABLE
# ============================================================

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


$TableOutput = $TableSql | & $MysqlExe `
    "-h" $DbHost `
    "-P" "$DbPort" `
    "-u" $DbUser `
    "-N" `
    "-B" `
    "$Database" `
    2>$null


$TableExitCode = $LASTEXITCODE


if ($TableExitCode -ne 0) {

    Write-ErrorMessage "Khong the kiem tra danh sach bang."


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


# ============================================================
# 12.3 CHUYỂN OUTPUT THÀNH MẢNG
# ============================================================

$ActualTables = @()


foreach ($Line in $TableOutput) {

    $TableName = "$Line".Trim()


    if (-not [string]::IsNullOrWhiteSpace($TableName)) {

        $ActualTables += $TableName
    }
}


# ============================================================
# 12.4 HIỂN THỊ TABLE
# ============================================================

Write-Host ""

Write-Host `
    "Cac bang hien co:" `
    -ForegroundColor White


foreach ($TableName in $ActualTables) {

    Write-Host `
        "  - $TableName" `
        -ForegroundColor Gray
}


# ============================================================
# 12.5 KIỂM TRA ĐỦ 9 TABLE
# ============================================================

if ($ActualTables.Count -ne 9) {

    Write-ErrorMessage "Database phai co 9 bang."

    Write-Host ""

    Write-Host `
        "Hien tai: $($ActualTables.Count) bang." `
        -ForegroundColor Yellow


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


# ============================================================
# 12.6 KIỂM TRA TÊN TỪNG TABLE
# ============================================================

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


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


Write-Success "Da tim thay day du 9 bang."


# ============================================================
# 13. KIỂM TRA SỐ LƯỢNG DỮ LIỆU
# ============================================================

Write-Host ""

Write-Host `
    "Dang kiem tra du lieu seed..." `
    -ForegroundColor Cyan


foreach ($ExpectedTable in $ExpectedTables) {

    # --------------------------------------------------------
    # Kết quả SQL:
    #
    # SELECT COUNT(*) FROM `nhan_vien`;
    # --------------------------------------------------------

    $CountSql = `
        "SELECT COUNT(*) FROM ``$ExpectedTable``;"


    $CountOutput = $CountSql | & $MysqlExe `
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


# ============================================================
# 14. KIỂM TRA DATABASE CUỐI CÙNG
# ============================================================

Write-Host ""

Write-Host `
    "Dang kiem tra database $Database..." `
    -ForegroundColor Cyan


$DatabaseSql = @"
SELECT SCHEMA_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME = '$Database';
"@


$DatabaseOutput = $DatabaseSql | & $MysqlExe `
    "-h" $DbHost `
    "-P" "$DbPort" `
    "-u" $DbUser `
    "-N" `
    "-B" `
    2>$null


$DatabaseExitCode = $LASTEXITCODE


if ($DatabaseExitCode -ne 0) {

    Write-ErrorMessage "Khong the kiem tra database."


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


if ("$DatabaseOutput".Trim() -ne $Database) {

    Write-ErrorMessage `
        "Database $Database khong ton tai."


    if ($null -eq $OldMysqlPwd) {

        Remove-Item `
            Env:MYSQL_PWD `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:MYSQL_PWD = $OldMysqlPwd
    }


    exit 1
}


Write-Success `
    "Database $Database dang hoat dong."


# ============================================================
# 15. KHÔI PHỤC MYSQL_PWD
# ============================================================

if ($null -eq $OldMysqlPwd) {

    Remove-Item `
        Env:MYSQL_PWD `
        -ErrorAction SilentlyContinue
}
else {

    $env:MYSQL_PWD = $OldMysqlPwd
}


# ============================================================
# 16. HOÀN THÀNH
# ============================================================

Write-Host ""

Write-Host `
    "============================================================" `
    -ForegroundColor Green

Write-Host `
    "              RESET DATABASE THANH CONG" `
    -ForegroundColor Green

Write-Host `
    "============================================================" `
    -ForegroundColor Green

Write-Host ""

Write-Host `
    "Database : $Database" `
    -ForegroundColor White

Write-Host `
    "Host     : $DbHost" `
    -ForegroundColor White

Write-Host `
    "Port     : $DbPort" `
    -ForegroundColor White

Write-Host `
    "Tables   : 9" `
    -ForegroundColor White

Write-Host ""

Write-Host `
    "Hoan tat." `
    -ForegroundColor Green

Write-Host ""