<?php
declare(strict_types=1);
// Deploy on Xserver. Enable only after sender and delivery checks.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function reply(int $status, array $data): void { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET','POST'], true)) reply(405, ['error'=>'対応していない操作です。']);
if ($method === 'POST' && ($_SERVER['HTTP_ORIGIN'] ?? '') !== 'https://aipartner-fuji.com') reply(403, ['error'=>'ページを開き直してください。']);
session_set_cookie_params(['secure'=>true,'httponly'=>true,'samesite'=>'Strict','path'=>'/contact-api/']);
session_start();
if ($method === 'GET') {
 if (empty($_SESSION['token'])) { $_SESSION['token']=bin2hex(random_bytes(32)); $_SESSION['issued']=time(); }
 reply(200, ['token'=>$_SESSION['token']]);
}
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>16000) reply(413,['error'=>'入力内容が長すぎます。']);
$data=json_decode(file_get_contents('php://input',false,null,0,16001),true);
if (!is_array($data)) reply(400,['error'=>'入力内容を確認してください。']);
foreach (['token','name','company','email','message','website','consent'] as $key) if (!isset($data[$key]) || !is_string($data[$key])) reply(400,['error'=>'入力内容を確認してください。']);
if (empty($_SESSION['token']) || !hash_equals($_SESSION['token'],$data['token'])) reply(403,['error'=>'ページを再読み込みして、もう一度お試しください。']);
if ($data['website'] !== '' || time()-($_SESSION['issued']??time())<3) reply(400,['error'=>'少し時間を置いてお試しください。']);
if ($data['consent']!=='yes' || trim($data['name'])==='' || trim($data['message'])==='' || strlen($data['name'])>400 || strlen($data['company'])>600 || strlen($data['message'])>4800 || strlen($data['email'])>200 || !filter_var($data['email'],FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/',$data['email'])) reply(422,['error'=>'必須項目とメールアドレスをご確認ください。']);
$configFile=dirname(__DIR__,2).'/aipartner-contact-config.php';
$config=is_file($configFile)?require $configFile:[];
if (empty($config['enabled']) || empty($config['sender']) || !preg_match('/\A[a-zA-Z0-9._+-]+@aipartner-fuji\.com\z/',$config['sender'])) reply(503,['error'=>'現在フォーム送信を利用できません。下記のメールアドレスからご連絡ください。']);
// Single lock and bounded state, outside the public directory. No message bodies stored.
$rateFile=dirname(__DIR__,2).'/aipartner-contact-rate.json';
$fh=fopen($rateFile,'c+');
if (!$fh || !flock($fh,LOCK_EX)) reply(503,['error'=>'現在送信できません。時間を置いてお試しください。']);
$state=json_decode(stream_get_contents($fh),true) ?: [];
$now=time(); foreach($state as $k=>$times) $state[$k]=array_values(array_filter($times,fn($t)=>$t>$now-3600));
$state=array_filter($state); $ip=hash('sha256',($_SERVER['REMOTE_ADDR']??'unknown').$config['sender']);
if(count($state[$ip]??[])>=3 || count($state['all']??[])>=30) { flock($fh,LOCK_UN); fclose($fh); reply(429,['error'=>'送信回数の上限です。時間を置くか、メールでご連絡ください。']); }
$state[$ip][]=$now; $state['all'][]=$now; ftruncate($fh,0); rewind($fh); fwrite($fh,json_encode($state)); fflush($fh); flock($fh,LOCK_UN); fclose($fh); @chmod($rateFile,0600);
$id=bin2hex(random_bytes(6));
$body="受付番号: $id\n\nお名前: ".$data['name']."\n会社名: ".$data['company']."\nメール: ".$data['email']."\n\nご相談内容:\n".$data['message'];
$headers=['From'=>'AI_Partner <'.$config['sender'].'>','Reply-To'=>$data['email'],'MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8','Content-Transfer-Encoding'=>'base64'];
$ok=mail('t.yamakado.ai.partner@gmail.com','=?UTF-8?B?'.base64_encode('HPからのお問い合わせ').'?=',chunk_split(base64_encode($body)),$headers);
if(!$ok) reply(503,['error'=>'送信できませんでした。入力内容は残しています。メールでのご連絡もご利用ください。']);
unset($_SESSION['token']);
reply(200,['id'=>$id,'message'=>'お問い合わせを送信しました。担当者からの返信をお待ちください。']);
